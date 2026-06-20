import { NextResponse } from 'next/server';
import { eq, and, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { rowToPurchaseOrder } from '@/lib/db/operations.serializers';
import { receiveConfirmed } from '@/lib/db/inventoryHelpers';
import { createExpenseTx, notifyPendingTransaction } from '@/lib/db/createExpenseTx';
import { getTodayJalali } from '@/lib/jalali';
import { audit } from '@/lib/auth/audit';

/**
 * POST /api/purchase-orders/[id]/receive
 *   «دریافت کالا» — تطبیق سه‌طرفه: سفارش خرید <-> برگه‌ی ورود انبار (approved) <-> سند هزینه‌ی نسیه.
 *   فقط روی سفارش‌های sent، یک‌بار (بعد از این status=received).
 *
 *   - اقلام متصل به انبار: برگه‌ی in از همان لحظه approved ساخته می‌شود و میانگین
 *     موزون با قیمت واقعی دریافت (receiveConfirmed) به‌روزرسانی می‌شود.
 *   - برای همه‌ی اقلام (متصل/غیرمتصل): یک تراکنش هزینه‌ی نسیه با طرف‌حساب
 *     تأمین‌کننده ساخته می‌شود (createExpenseTx).
 *   - انباردار می‌تواند دریافت را ثبت کند اما قیمت همیشه برابر سفارش است
 *     (قابل مشاهده/ویرایش نیست) و تراکنش حاصل بر اساس role او pending می‌ماند.
 *   - مغایرت مقدار/قیمت در هر ردیف → audit_log (po.receiveDiscrepancy) + اعلان SuperAdmin.
 */

const MONEY_MAX = 100_000_000_000; // ۱۰۰ میلیارد تومان

const lineSchema = z.object({
  poItemId: z.string().uuid(),
  receivedQty: z.number().finite().min(0).max(1_000_000_000, 'مقدار خیلی بزرگ است'),
  receivedUnitPrice: z.number().finite('بهای واحد نامعتبر است').min(0).max(MONEY_MAX, 'بهای واحد بیش از حد مجاز است').optional(),
});

const receiveSchema = z.object({
  lines: z.array(lineSchema).min(1, 'حداقل یک قلم لازم است'),
  vatAmount: z.number().finite().min(0).max(MONEY_MAX, 'مبلغ مالیات بیش از حد مجاز است').optional().default(0),
});

type PoItemRow = typeof schema.purchaseOrderItems.$inferSelect;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    const input = receiveSchema.parse(await req.json());

    const [order] = await db.select().from(schema.purchaseOrders)
      .where(eq(schema.purchaseOrders.id, params.id)).limit(1);
    if (!order) throw new ApiError(404, 'سفارش خرید پیدا نشد', 'NOT_FOUND');
    if (session.role !== 'SuperAdmin' && session.branchId !== order.branchId) {
      throw new ApiError(403, 'شما فقط می‌توانید سفارش‌های شعبه‌ی خود را دریافت کنید', 'BRANCH_MISMATCH');
    }
    if (order.status !== 'sent') {
      throw new ApiError(409, 'فقط سفارش‌های ارسال‌شده قابل دریافت‌اند', 'INVALID_STATE');
    }

    const items = await db.select().from(schema.purchaseOrderItems)
      .where(eq(schema.purchaseOrderItems.orderId, params.id));
    const itemsById = new Map(items.map(it => [it.id, it]));

    for (const l of input.lines) {
      if (!itemsById.has(l.poItemId)) throw new ApiError(404, 'قلم سفارش پیدا نشد', 'ITEM_NOT_FOUND');
    }
    const linesByItemId = new Map(input.lines.map(l => [l.poItemId, l]));

    const invItemIds = items.map(it => it.inventoryItemId).filter((id): id is string => !!id);
    const basePerUnitById = new Map<string, number>();
    if (invItemIds.length > 0) {
      const invRows = await db.select({ id: schema.invItems.id, basePerUnit: schema.invItems.basePerUnit })
        .from(schema.invItems).where(inArray(schema.invItems.id, invItemIds));
      for (const r of invRows) basePerUnitById.set(r.id, parseFloat(r.basePerUnit) || 1);
    }

    const isWarehouse = session.role === 'Warehouse';
    const date = getTodayJalali();

    interface EffLine {
      poItem: PoItemRow;
      receivedQty: number;
      effectiveUnitPrice: number;
      lineTotal: number;
      discrepancy: boolean;
    }
    const effLines: EffLine[] = items.map((poItem) => {
      const line = linesByItemId.get(poItem.id);
      const orderedQty = parseFloat(poItem.qty);
      const receivedQty = line ? line.receivedQty : orderedQty;
      const effectiveUnitPrice = isWarehouse ? poItem.unitCost : (line?.receivedUnitPrice ?? poItem.unitCost);
      const lineTotal = Math.round(receivedQty * effectiveUnitPrice);
      const discrepancy = receivedQty !== orderedQty || effectiveUnitPrice !== poItem.unitCost;
      return { poItem, receivedQty, effectiveUnitPrice, lineTotal, discrepancy };
    });

    const grandTotal = effLines.reduce((s, l) => s + l.lineTotal, 0);
    const hasDiscrepancy = effLines.some(l => l.discrepancy);
    const voucherLines = effLines.filter(l => l.poItem.inventoryItemId && l.receivedQty > 0);
    const voucherTotal = voucherLines.reduce((s, l) => s + l.lineTotal, 0);

    // طرف‌حساب / شعبه / دسته‌بندی برای سند مالی
    let supplierName = order.no;
    if (order.supplierId) {
      const [supplier] = await db.select({ name: schema.contacts.name })
        .from(schema.contacts).where(eq(schema.contacts.id, order.supplierId)).limit(1);
      if (supplier) supplierName = supplier.name;
    }
    const [branch] = await db.select({ name: schema.branches.name })
      .from(schema.branches).where(eq(schema.branches.id, order.branchId)).limit(1);
    const branchName = branch?.name ?? '';

    const [category] = await db.select({ id: schema.categories.id })
      .from(schema.categories)
      .where(and(eq(schema.categories.type, 'expense'), eq(schema.categories.name, 'خرید مواد اولیه')))
      .limit(1);

    const { updatedOrder, voucher, coreTx } = await db.transaction(async (dbTx) => {
      let voucher: typeof schema.invVouchers.$inferSelect | null = null;

      if (voucherLines.length > 0) {
        const seq = await dbTx.select({ id: schema.invVouchers.id }).from(schema.invVouchers)
          .where(eq(schema.invVouchers.branchId, order.branchId));
        const no = `R-${date.replace(/[^0-9]/g, '').slice(0, 6)}-${String(seq.length + 1).padStart(3, '0')}`;

        const [v] = await dbTx.insert(schema.invVouchers).values({
          no,
          kind: 'in',
          status: 'approved',
          branchId: order.branchId,
          estTotal: voucherTotal,
          finalTotal: voucherTotal,
          note: `دریافت کالا — سفارش خرید ${order.no}`,
          createdBy: session.sub,
          makerDate: date,
          approvedBy: session.sub,
          approvedAt: new Date(),
        }).returning();
        if (!v) throw new ApiError(500, 'خطا در ثبت رسید انبار', 'INSERT_FAILED');
        voucher = v;

        for (const l of voucherLines) {
          const itemId = l.poItem.inventoryItemId!;
          const basePerUnit = basePerUnitById.get(itemId) ?? 1;
          const qtyBase = l.receivedQty * basePerUnit;
          const unitCostPerBase = l.effectiveUnitPrice / basePerUnit;

          await dbTx.insert(schema.invVoucherLines).values({
            voucherId: v.id,
            itemId,
            qtyBase: String(qtyBase),
            estUnitCost: String(unitCostPerBase),
            finalUnitCost: String(unitCostPerBase),
          });
          await receiveConfirmed(dbTx, itemId, qtyBase, l.lineTotal);
          await dbTx.insert(schema.invStockTx).values({
            itemId,
            voucherId: v.id,
            kind: 'in',
            deltaBase: String(qtyBase),
            value: l.lineTotal,
            note: `دریافت سفارش خرید ${order.no}`,
            jalaliDate: date,
          });
        }
      }

      const coreTx = await createExpenseTx(dbTx, {
        type: 'expense',
        title: `خرید مواد اولیه — سفارش ${order.no}`,
        categoryId: category?.id ?? null,
        categoryName: 'خرید مواد اولیه',
        amount: grandTotal,
        payee: supplierName,
        branchId: order.branchId,
        branchName,
        method: 'نسیه',
        date,
        note: `دریافت کالا برای سفارش خرید ${order.no}`,
        accountId: null,
        contactId: order.supplierId ?? null,
        vatAmount: input.vatAmount,
        isCredit: true,
        createdBy: session.sub,
        role: session.role,
      });

      const [updated] = await dbTx.update(schema.purchaseOrders)
        .set({
          status: 'received',
          receivedBy: session.sub,
          refTransactionId: coreTx.id,
          refInvVoucherId: voucher?.id ?? null,
          finalTotal: grandTotal,
        })
        .where(eq(schema.purchaseOrders.id, params.id))
        .returning();
      if (!updated) throw new ApiError(500, 'خطا در به‌روزرسانی سفارش خرید', 'UPDATE_FAILED');

      return { updatedOrder: updated, voucher, coreTx };
    });

    if (coreTx.status === 'pending') {
      await notifyPendingTransaction(coreTx.id, coreTx.title, branchName);
    }

    if (hasDiscrepancy) {
      const { notifyAdmins } = await import('@/lib/notify');
      await notifyAdmins({
        type: 'info',
        title: 'مغایرت دریافت سفارش خرید',
        sub: `سفارش ${order.no} — ${branchName}`,
        txId: coreTx.id,
        actionUrl: `/purchase-orders/${params.id}`,
        entityId: params.id,
        ruleKey: 'po_received',
      });

      audit({
        action: 'po.receiveDiscrepancy',
        userId: session.sub,
        meta: {
          orderId: order.id,
          no: order.no,
          lines: effLines.filter(l => l.discrepancy).map(l => ({
            poItemId: l.poItem.id,
            description: l.poItem.description,
            orderedQty: parseFloat(l.poItem.qty),
            receivedQty: l.receivedQty,
            orderedUnitPrice: l.poItem.unitCost,
            receivedUnitPrice: l.effectiveUnitPrice,
          })),
        },
      });
    }

    audit({
      action: 'po.received',
      userId: session.sub,
      meta: {
        orderId: order.id, no: order.no,
        voucherId: voucher?.id ?? null, voucherNo: voucher?.no ?? null,
        transactionId: coreTx.id, hasDiscrepancy,
      },
    });

    const orderItems = await db.select().from(schema.purchaseOrderItems)
      .where(eq(schema.purchaseOrderItems.orderId, params.id));

    return NextResponse.json({
      order: rowToPurchaseOrder(updatedOrder, orderItems),
      voucherNo: voucher?.no ?? null,
      transactionId: coreTx.id,
      hasDiscrepancy,
    });
  } catch (e) {
    return handleError(e);
  }
}
