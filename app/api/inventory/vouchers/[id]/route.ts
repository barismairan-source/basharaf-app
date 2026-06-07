import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { rejectVoucherTx } from '@/lib/db/inventoryHelpers';
import { reversePurchasePost } from '@/lib/inventory/postToAccounting';

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
