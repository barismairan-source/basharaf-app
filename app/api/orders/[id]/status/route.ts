import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { getOrderRow, transitionOrderStatus } from '@/lib/ordering/orders';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  status: z.enum([
    'received', 'confirmed', 'preparing', 'ready',
    'out_for_delivery', 'delivered', 'completed', 'cancelled', 'rejected',
  ]),
});

/**
 * PATCH /api/orders/[id]/status
 *
 * انتقال وضعیت سفارش — فقط طبق state machine (lib/ordering/orderStatus.ts) مجاز
 * است، در غیر این صورت 422. اتمیک: update orders.status + insert order_events.
 * رهگیری مشتری (/order/track/[token]) همین orders.status را می‌خواند.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole('SuperAdmin', 'BranchUser');
    const input = patchSchema.parse(await req.json());

    const existing = await getOrderRow(params.id);
    if (!existing) throw new ApiError(404, 'سفارش پیدا نشد', 'ORDER_NOT_FOUND');
    if (session.role === 'BranchUser' && session.branchId !== existing.branchId) {
      throw new ApiError(403, 'شما فقط می‌توانید سفارش‌های شعبه‌ی خود را تغییر دهید', 'BRANCH_MISMATCH');
    }

    const order = await transitionOrderStatus(existing, input.status, session.sub);
    return NextResponse.json({ order });
  } catch (e) {
    return handleError(e);
  }
}
