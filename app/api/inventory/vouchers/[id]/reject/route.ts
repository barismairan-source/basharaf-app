import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { canDo } from '@/lib/auth/permissions';
import { ApiError, handleError } from '@/lib/api-error';
import { rowToInvVoucher } from '@/lib/db/inventory.serializers';
import { rejectVoucherTx } from '@/lib/db/inventoryHelpers';
import { audit } from '@/lib/auth/audit';

/**
 * POST /api/inventory/vouchers/[id]/reject — رد برگه، برگشت اثر فیزیکی موقت.
 * body: { reason: string }
 */

const bodySchema = z.object({ reason: z.string().max(500).optional().default('') });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    if (!canDo(session, 'inventory.approve')) {
      throw new ApiError(403, 'شما اجازه‌ی رد برگه‌ی انبار را ندارید', 'FORBIDDEN');
    }
    const { reason } = bodySchema.parse(await req.json().catch(() => ({})));

    const [current] = await db.select().from(schema.invVouchers)
      .where(eq(schema.invVouchers.id, params.id)).limit(1);
    if (!current) throw new ApiError(404, 'برگه پیدا نشد', 'VOUCHER_NOT_FOUND');
    if (current.status !== 'pending') {
      throw new ApiError(409, 'فقط برگه‌های در انتظار قابل ارجاع هستند', 'INVALID_STATE');
    }

    const lines = await db.select().from(schema.invVoucherLines)
      .where(eq(schema.invVoucherLines.voucherId, params.id));

    const now = new Date();
    const kind = current.kind as 'in' | 'out' | 'waste' | 'sale' | 'produce' | 'stocktake';

    await db.transaction(async (dbTx) => {
      // فقط اثر فیزیکی موقت برگشت می‌خورد (قطعی هرگز اعمال نشده)
      await rejectVoucherTx(
        dbTx,
        kind,
        lines.map((l) => ({ itemId: l.itemId, qtyBase: parseFloat(l.qtyBase), estUnitCost: parseFloat(l.estUnitCost) }))
      );
      await dbTx.update(schema.invVouchers)
        .set({ status: 'rejected', rejectedBy: session.sub, rejectedAt: now, rejectionReason: reason || 'بدون دلیل ذکرشده', updatedAt: now })
        .where(eq(schema.invVouchers.id, params.id));
    });

    const [updated] = await db.select().from(schema.invVouchers)
      .where(eq(schema.invVouchers.id, params.id)).limit(1);
    const updatedLines = await db.select().from(schema.invVoucherLines)
      .where(eq(schema.invVoucherLines.voucherId, params.id));

    if (updated && updated.createdBy && updated.createdBy !== session.sub) {
      const { notify } = await import('@/lib/notify');
      await notify({
        type: 'rejected',
        title: 'برگه انبار ارجاع شد',
        sub: `برگه ${updated.no} — ${reason || 'بدون دلیل'}`,
        txId: null,
        actionUrl: `/inventory/cartable`,
        entityId: updated.id,
        userId: updated.createdBy,
      });
    }

    audit({ action: 'inv.voucher.rejected', userId: session.sub, meta: { voucherId: params.id, reason } });
    return NextResponse.json({ voucher: rowToInvVoucher(updated!, updatedLines) });
  } catch (e) {
    return handleError(e);
  }
}
