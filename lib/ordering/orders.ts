import { and, asc, eq, inArray, notInArray, or } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { ApiError } from '@/lib/api-error';
import { getTodayJalali } from '@/lib/jalali';
import { rowToBoardOrder } from '@/lib/db/ordering.serializers';
import { postOrderSaleToAccounting } from './orderAccounting';
import { ORDER_STATUS_LABELS, TERMINAL_STATUSES, canTransition } from './orderStatus';
import type { BoardOrder, OrderStatus } from '@/types';

type OrderRow = typeof schema.orders.$inferSelect;
type OrderLineRow = typeof schema.orderLines.$inferSelect;

/**
 * ─────────────────────────────────────────────────────────────────
 * تخته‌ی عملیاتی پرسنل /orders — لیست سفارش‌ها + انتقال وضعیت.
 * scope شعبه در route چک می‌شود؛ این ماژول فقط opts.branchId را اعمال می‌کند.
 * ───────────────────────────────────────────────────────────────── */

/**
 * سفارش‌های امروز + هر سفارش بازِ روزهای قبل (که هنوز به وضعیت پایانی نرسیده).
 * فیلتر «امروز/باز» در UI روی همین مجموعه انجام می‌شود.
 */
export async function listBoardOrders(opts: { branchId?: string }): Promise<BoardOrder[]> {
  const todayJalali = getTodayJalali();
  const conditions = [
    or(eq(schema.orders.jalaliDate, todayJalali), notInArray(schema.orders.status, [...TERMINAL_STATUSES])),
  ];
  if (opts.branchId) conditions.push(eq(schema.orders.branchId, opts.branchId));

  const rows = await db
    .select({ order: schema.orders, branchName: schema.branches.name })
    .from(schema.orders)
    .leftJoin(schema.branches, eq(schema.orders.branchId, schema.branches.id))
    .where(and(...conditions))
    .orderBy(asc(schema.orders.createdAt));

  if (rows.length === 0) return [];

  const orderIds = rows.map((r) => r.order.id);
  const allLines = await db.select().from(schema.orderLines).where(inArray(schema.orderLines.orderId, orderIds));
  const linesByOrder = new Map<string, OrderLineRow[]>();
  for (const line of allLines) {
    const arr = linesByOrder.get(line.orderId) ?? [];
    arr.push(line);
    linesByOrder.set(line.orderId, arr);
  }

  const zoneIds = [...new Set(rows.map((r) => r.order.zoneId).filter((z): z is string => !!z))];
  const zoneNameById = new Map<string, string>();
  if (zoneIds.length > 0) {
    const zones = await db.select().from(schema.ordZones).where(inArray(schema.ordZones.id, zoneIds));
    for (const zone of zones) zoneNameById.set(zone.id, zone.name);
  }

  return rows.map((r) =>
    rowToBoardOrder(
      r.order,
      linesByOrder.get(r.order.id) ?? [],
      r.branchName ?? '',
      r.order.zoneId ? zoneNameById.get(r.order.zoneId) ?? null : null
    )
  );
}

/** سفارش خام برای چک RBAC (branchId) قبل از انتقال وضعیت. */
export async function getOrderRow(id: string): Promise<OrderRow | null> {
  const [row] = await db.select().from(schema.orders).where(eq(schema.orders.id, id)).limit(1);
  return row ?? null;
}

/**
 * انتقال وضعیت سفارش — فقط اگر طبق state machine مجاز باشد (در غیر این صورت 422).
 * اتمیک: update orders.status + insert order_events با actor.
 */
export async function transitionOrderStatus(
  existing: OrderRow,
  toStatus: OrderStatus,
  actorUserId: string
): Promise<BoardOrder> {
  const fromStatus = existing.status as OrderStatus;
  const serviceType = existing.serviceType as 'delivery' | 'pickup';

  if (!canTransition(fromStatus, toStatus, serviceType)) {
    throw new ApiError(
      422,
      `انتقال از «${ORDER_STATUS_LABELS[fromStatus]}» به «${ORDER_STATUS_LABELS[toStatus]}» مجاز نیست`,
      'INVALID_TRANSITION'
    );
  }

  // باکس ۵: اثر مالی/انباری فقط در وضعیت نهایی موفق (delivered/completed) —
  // آنلاین: فقط اگر pay_status=paid؛ نقدی: همین تحویل/تکمیل = تسویه‌شدن.
  const isSuccessfulCompletion = toStatus === 'delivered' || toStatus === 'completed';
  const paymentSettled = existing.payMethod === 'online' ? existing.payStatus === 'paid' : true;
  const shouldPostSale = isSuccessfulCompletion && paymentSettled && !existing.saleTransactionId;

  const updated = await db.transaction(async (tx) => {
    const statusUpdate: Partial<typeof schema.orders.$inferInsert> = { status: toStatus };
    if (shouldPostSale && existing.payMethod === 'cash' && existing.payStatus !== 'paid') {
      statusUpdate.payStatus = 'paid';
    }

    const [order] = await tx
      .update(schema.orders)
      .set(statusUpdate)
      .where(eq(schema.orders.id, existing.id))
      .returning();
    if (!order) throw new ApiError(500, 'خطا در به‌روزرسانی سفارش', 'UPDATE_FAILED');

    await tx.insert(schema.orderEvents).values({
      orderId: existing.id,
      fromStatus,
      toStatus,
      actorUserId,
    });

    if (!shouldPostSale) return order;

    const orderLines = await tx.select().from(schema.orderLines).where(eq(schema.orderLines.orderId, order.id));
    const [branch] = await tx.select().from(schema.branches).where(eq(schema.branches.id, order.branchId)).limit(1);
    const result = await postOrderSaleToAccounting(tx, order, orderLines, branch?.name ?? '', actorUserId);

    const [final] = await tx
      .update(schema.orders)
      .set({ saleTransactionId: result.transactionId })
      .where(eq(schema.orders.id, order.id))
      .returning();
    return final ?? order;
  });

  const lines = await db.select().from(schema.orderLines).where(eq(schema.orderLines.orderId, updated.id));

  const [branch] = await db.select().from(schema.branches).where(eq(schema.branches.id, updated.branchId)).limit(1);

  let zoneName: string | null = null;
  if (updated.zoneId) {
    const [zone] = await db.select().from(schema.ordZones).where(eq(schema.ordZones.id, updated.zoneId)).limit(1);
    zoneName = zone?.name ?? null;
  }

  return rowToBoardOrder(updated, lines, branch?.name ?? '', zoneName);
}
