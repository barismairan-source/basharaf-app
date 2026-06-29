import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { rejectVoucherTx, applyPhysicalLine } from '@/lib/db/inventoryHelpers';
import { reversePurchasePost } from '@/lib/inventory/postToAccounting';
import { rowToInvVoucher } from '@/lib/db/inventory.serializers';

const patchSchema = z.object({
  note: z.string().max(500).optional(),
  lines: z.array(z.object({
    itemId: z.string().uuid(),
    qtyBase: z.number().finite().positive().max(1_000_000_000),
    estUnitCost: z.number().finite().min(0).max(100_000_000_000).default(0),
  })).min(1).optional(),
});

/**
 * PATCH /api/inventory/vouchers/[id] — ویرایش برگه‌ی pending.
 * اگر خطوط تغییر کنند: اثر فیزیکی قدیم برگردانده → اثر فیزیکی جدید اعمال می‌شود.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const input = patchSchema.parse(await req.json());

    const [v] = await db.select().from(schema.invVouchers)
      .where(eq(schema.invVouchers.id, params.id)).limit(1);
    if (!v) throw new ApiError(404, 'برگه پیدا نشد', 'NOT_FOUND');
    if (v.status !== 'pending') throw new ApiError(409, 'فقط برگه‌ی pending قابل ویرایش است', 'NOT_PENDING');

    const kind = v.kind as 'in' | 'out' | 'waste' | 'sale' | 'produce' | 'stocktake';

    await db.transaction(async (dbTx) => {
      if (input.lines) {
        // ۱. خطوط قدیمی را بخوان و اثر فیزیکی آن‌ها را برگردان
        const oldLines = await dbTx.select().from(schema.invVoucherLines)
          .where(eq(schema.invVoucherLines.voucherId, params.id));
        for (const l of oldLines) {
          await applyPhysicalLine(dbTx, l.itemId, parseFloat(l.qtyBase), kind, -1);
        }
        // ۲. خطوط جدید را اعمال کن
        for (const l of input.lines) {
          await applyPhysicalLine(dbTx, l.itemId, l.qtyBase, kind, 1);
        }
        // ۳. خطوط قدیمی را حذف و جدید را بنویس
        await dbTx.delete(schema.invVoucherLines)
          .where(eq(schema.invVoucherLines.voucherId, params.id));
        await dbTx.insert(schema.invVoucherLines).values(
          input.lines.map((l) => ({
            voucherId: params.id,
            itemId: l.itemId,
            qtyBase: String(l.qtyBase),
            estUnitCost: String(l.estUnitCost),
            finalUnitCost: '0',
          }))
        );
        // ۴. estTotal برگه را به‌روز کن
        const estTotal = Math.round(input.lines.reduce((s, l) => s + l.estUnitCost * l.qtyBase, 0));
        await dbTx.update(schema.invVouchers)
          .set({ estTotal, ...(input.note != null ? { note: input.note } : {}) })
          .where(eq(schema.invVouchers.id, params.id));
      } else if (input.note != null) {
        await dbTx.update(schema.invVouchers)
          .set({ note: input.note })
          .where(eq(schema.invVouchers.id, params.id));
      }
    });

    const [updated] = await db.select().from(schema.invVouchers)
      .where(eq(schema.invVouchers.id, params.id)).limit(1);
    const updatedLines = await db.select().from(schema.invVoucherLines)
      .where(eq(schema.invVoucherLines.voucherId, params.id));
    return NextResponse.json({ voucher: rowToInvVoucher(updated!, updatedLines, false) });
  } catch (e) {
    return handleError(e);
  }
}

/**
 * DELETE /api/inventory/vouchers/[id] — حذف کامل برگه.
 * - اگر pending: اثر فیزیکی موقت برگردانده می‌شود.
 * - اگر approved: سند مالی مرتبط هم برگردانده می‌شود (و اثر قطعی... فعلاً فقط pending/rejected امن است).
 *   برای امنیت، حذف approved را اجازه نمی‌دهیم (باید اول منطق reverse قطعی کامل شود).
 */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();

    const [v] = await db.select().from(schema.invVouchers)
      .where(eq(schema.invVouchers.id, params.id)).limit(1);
    if (!v) throw new ApiError(404, 'برگه پیدا نشد', 'NOT_FOUND');

    if (v.status === 'approved') {
      throw new ApiError(409, 'برگه‌ی تأییدشده قابل حذف نیست. اول باید اثرش برگردانده شود.', 'CANNOT_DELETE_APPROVED');
    }

    const lines = await db.select().from(schema.invVoucherLines)
      .where(eq(schema.invVoucherLines.voucherId, params.id));

    await db.transaction(async (dbTx) => {
      // اگر pending بود، اثر فیزیکی موقت را برگردان (rejected قبلاً برگردانده شده)
      if (v.status === 'pending') {
        const kind = v.kind as 'in' | 'out' | 'waste' | 'sale' | 'produce' | 'stocktake';
        const prepared = lines.map((l) => ({
          itemId: l.itemId,
          qtyBase: parseFloat(l.qtyBase),
          estUnitCost: parseFloat(l.estUnitCost),
          finalUnitCost: null,
        }));
        await rejectVoucherTx(dbTx, kind, prepared);
      }
      // حذف خطوط و برگه
      await dbTx.delete(schema.invVoucherLines).where(eq(schema.invVoucherLines.voucherId, params.id));
      await dbTx.delete(schema.invVouchers).where(eq(schema.invVouchers.id, params.id));
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
