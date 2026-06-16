import { and, eq, inArray } from 'drizzle-orm';
import { schema } from '@/lib/db/client';
import { applyBalance } from '@/lib/db/balanceHelpers';
import { applyMenuSaleDeduction, type MenuSaleLine } from '@/lib/inventory/menuSaleDeduction';
import { audit } from '@/lib/auth/audit';

/**
 * پل حسابداری/انبار سفارش بیرون‌بر (باکس ۵).
 *
 * وقتی سفارش به وضعیت نهایی موفق (delivered/completed) با پرداخت تسویه‌شده می‌رسد،
 * این تابع — درون همان db.transaction انتقال وضعیت — یک‌جا:
 *   ۱. تراکنش فروشِ approved می‌سازد (amount = order.total، vatAmount از split
 *      VAT خطوط طبق menu_categories.vat_rate — پیش‌فرض ۱۰٪/۱.۱ غذا، نوشیدنی ۱۶٪/۱.۱۶).
 *   ۲. اثر آن را روی موجودی صندوق اعمال می‌کند (applyBalance).
 *   ۳. برای خطوطی که menu_item_id دارند، همان backflushing منو (رسپی + WAC + yield)
 *      را اجرا و در صورت COGS مثبت، سند هزینه‌ی COGS می‌سازد.
 *   ۴. برای خطوط بدون نگاشت رسپی (یا کسری موجودی)، silent fail نمی‌کند —
 *      audit log + اعلان به همه‌ی SuperAdminها.
 *
 * ضد-تکرار: idempotency با orders.sale_transaction_id توسط فراخواننده
 * (transitionOrderStatus) پیش از صدا زدن این تابع بررسی می‌شود.
 */

type OrderRow = typeof schema.orders.$inferSelect;
type OrderLineRow = typeof schema.orderLines.$inferSelect;

/** نرخ پیش‌فرض VAT (٪) وقتی خط سفارش به menu_items/menu_categories نگاشت ندارد یا دسته نرخ ندارد — غذا. */
const DEFAULT_VAT_RATE = 10;

export interface OrderSalePostResult {
  transactionId: string;
  cogsTransactionId: string | null;
  vatAmount: number;
  totalCogs: number;
  warnings: string[];
}

/** نرخ VAT (٪) هر menu_item — از menu_categories.vat_rate، با fallback پیش‌فرض. */
async function loadVatRates(tx: any, menuItemIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (menuItemIds.length === 0) return map;

  const rows = await tx.select({
    id: schema.menuItems.id,
    vatRate: schema.menuCategories.vatRate,
  })
    .from(schema.menuItems)
    .innerJoin(schema.menuCategories, eq(schema.menuItems.categoryId, schema.menuCategories.id))
    .where(inArray(schema.menuItems.id, menuItemIds));

  for (const r of rows) {
    map.set(r.id, r.vatRate ?? DEFAULT_VAT_RATE);
  }
  return map;
}

/** اتصال شعبه‌ی سفارش به یک حساب فعال — اولویت با حساب همان شعبه، در غیر این صورت اولین حساب فعال. */
async function resolveAccountId(tx: any, branchId: string): Promise<string | null> {
  const [byBranch] = await tx.select({ id: schema.accounts.id }).from(schema.accounts)
    .where(and(eq(schema.accounts.branchId, branchId), eq(schema.accounts.isActive, true))).limit(1);
  if (byBranch?.id) return byBranch.id;

  const [fallback] = await tx.select({ id: schema.accounts.id }).from(schema.accounts)
    .where(eq(schema.accounts.isActive, true)).limit(1);
  return fallback?.id ?? null;
}

export async function postOrderSaleToAccounting(
  tx: any,
  order: OrderRow,
  lines: OrderLineRow[],
  branchName: string,
  userId: string,
): Promise<OrderSalePostResult> {
  const accountId = await resolveAccountId(tx, order.branchId);

  // ── split VAT — خط‌به‌خط، طبق نرخ دسته‌ی هر آیتم منو ──
  const menuItemIds = [...new Set(lines.map((l) => l.menuItemId).filter((id): id is string => !!id))];
  const vatRates = await loadVatRates(tx, menuItemIds);

  let vatAmount = 0;
  for (const line of lines) {
    const rate = (line.menuItemId ? vatRates.get(line.menuItemId) : undefined) ?? DEFAULT_VAT_RATE;
    const divisor = 1 + rate / 100;
    const net = Math.round(Number(line.lineTotal) / divisor);
    vatAmount += Number(line.lineTotal) - net;
  }

  const saleMetaLines: MenuSaleLine[] = lines
    .filter((l): l is OrderLineRow & { menuItemId: string } => !!l.menuItemId)
    .map((l) => ({ menuItemId: l.menuItemId, qty: l.qty }));

  // ── ۱) تراکنش فروشِ approved — amount = total، vatAmount = جمع VAT خطوط ──
  const [coreTx] = await tx.insert(schema.transactions).values({
    type: 'income',
    title: `فروش سفارش بیرون‌بر — ${order.orderNo}`,
    categoryId: null,
    categoryName: 'فروش سفارش بیرون‌بر',
    amount: order.total,
    payee: order.customerName,
    branchId: order.branchId,
    branchName,
    method: order.payMethod === 'online' ? 'پرداخت آنلاین' : 'نقدی',
    accountId,
    vatAmount,
    isCredit: false,
    date: order.jalaliDate,
    note: `ثبت خودکار — تکمیل سفارش بیرون‌بر ${order.orderNo}`,
    saleMeta: saleMetaLines.length > 0 ? { source: 'order', orderId: order.id, lines: saleMetaLines } : null,
    status: 'approved',
    createdBy: userId,
    approvedBy: userId,
    approvedAt: new Date(),
  }).returning();
  if (!coreTx) throw new Error('ساخت تراکنش فروش سفارش بیرون‌بر ناموفق بود');

  if (accountId) await applyBalance(tx, coreTx);

  // ── ۲) پل انبار — backflushing رسپی برای خطوط نگاشت‌شده ──
  const warnings: string[] = [];
  let cogsTransactionId: string | null = null;
  let totalCogs = 0;

  if (saleMetaLines.length > 0) {
    const result = await applyMenuSaleDeduction(tx, order.branchId, order.jalaliDate, saleMetaLines, order.total);
    warnings.push(...result.warnings);
    totalCogs = result.totalCogs;
    const now = new Date();

    if (result.totalCogs > 0) {
      const [cogsTx] = await tx.insert(schema.transactions).values({
        type: 'expense',
        title: `بهای تمام‌شده‌ی کالای فروخته‌شده — ${order.orderNo}`,
        categoryId: null,
        categoryName: 'بهای تمام‌شده (COGS)',
        amount: result.totalCogs,
        payee: 'انبار',
        branchId: order.branchId,
        branchName,
        method: 'انبار',
        accountId: null, // فقط دفترداری — روی صندوق اثر ندارد
        vatAmount: 0,
        isCredit: false,
        date: order.jalaliDate,
        note: `ثبت خودکار از سفارش بیرون‌بر — کسر انبار و COGS بر اساس رسپی (${order.orderNo})`,
        status: 'approved',
        createdBy: userId,
        approvedBy: userId,
        approvedAt: now,
      }).returning();
      cogsTransactionId = cogsTx?.id ?? null;
    }

    await tx.update(schema.transactions)
      .set({
        saleMeta: {
          source: 'order', orderId: order.id, lines: saleMetaLines,
          deductedAt: now.toISOString(), cogsTransactionId, deductionLines: result.deductionLines,
        },
      })
      .where(eq(schema.transactions.id, coreTx.id));
  }

  // خطوطی که اصلاً به منو نگاشت ندارند (مثلاً ثبت‌شده پیش از این migration) — هشدار، نه silent fail
  for (const line of lines) {
    if (!line.menuItemId) {
      warnings.push(`آیتم «${line.itemName}» به منوی دیجیتال نگاشت ندارد — کسر انبار برای آن انجام نشد`);
    }
  }

  // ── ۳) هشدارها: silent fail ممنوع — audit + اعلان به همه‌ی SuperAdminها ──
  if (warnings.length > 0) {
    audit({
      action: 'transaction.menuSaleDeduction.warning',
      userId,
      meta: { orderId: order.id, orderNo: order.orderNo, txId: coreTx.id, warnings },
    });

    const admins = await tx.select({ id: schema.users.id })
      .from(schema.users).where(eq(schema.users.role, 'SuperAdmin'));
    for (const admin of admins) {
      await tx.insert(schema.notifications).values({
        type: 'info',
        title: 'هشدار کسر انبار سفارش بیرون‌بر',
        sub: `سفارش ${order.orderNo} — ${(warnings[0] ?? '').slice(0, 180)}`,
        time: 'به‌تازگی',
        read: false,
        txId: coreTx.id,
        userId: admin.id,
      });
    }
  }

  return { transactionId: coreTx.id, cogsTransactionId, vatAmount, totalCogs, warnings };
}
