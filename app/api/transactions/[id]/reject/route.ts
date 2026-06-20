import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { rowToTransaction } from '@/lib/db/serializers';
import { notify } from '@/lib/notify';

const rejectBodySchema = z.object({
  reason: z.string().max(300).optional(),
});

/**
 * POST /api/transactions/[id]/reject
 *
 * فقط SuperAdmin. تراکنش pending → rejected با دلیل.
 * یک اعلان rejected برای creator می‌سازد.
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const { reason } = rejectBodySchema.parse(body);

    const [current] = await db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.id, params.id))
      .limit(1);

    if (!current) {
      throw new ApiError(404, 'تراکنش پیدا نشد', 'TX_NOT_FOUND');
    }
    if (current.status !== 'pending') {
      throw new ApiError(
        409,
        'فقط تراکنش‌های در انتظار قابل رد هستند',
        'INVALID_STATE'
      );
    }

    const now = new Date();
    const finalReason = reason?.trim() || 'بدون دلیل ذکرشده';

    const [updated] = await db
      .update(schema.transactions)
      .set({
        status: 'rejected',
        rejectedBy: session.sub,
        rejectedAt: now,
        rejectionReason: finalReason,
        updatedAt: now,
      })
      .where(eq(schema.transactions.id, params.id))
      .returning();

    if (!updated) {
      throw new ApiError(500, 'خطا در به‌روزرسانی', 'UPDATE_FAILED');
    }

    if (updated.createdBy !== session.sub) {
      await notify({
        type: 'rejected',
        title: 'تراکنش رد شد',
        sub: `${updated.title} — ${updated.branchName}`,
        txId: updated.id,
        actionUrl: `/transactions`,
        entityId: updated.id,
        userId: updated.createdBy,
      });
    }

    return NextResponse.json({ transaction: rowToTransaction(updated) });
  } catch (e) {
    return handleError(e);
  }
}
