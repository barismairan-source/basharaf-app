import { NextResponse } from 'next/server';
import { ApiError, handleError } from '@/lib/api-error';
import { getPublicOrderByTrackToken } from '@/lib/ordering/publicOrders';

export const dynamic = 'force-dynamic';

/**
 * GET /api/public/order/track/[token] — رهگیری سفارش (عمومی، بدون auth، فقط‌خواندنی).
 */
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  try {
    const order = await getPublicOrderByTrackToken(params.token);
    if (!order) throw new ApiError(404, 'سفارش یافت نشد', 'ORDER_NOT_FOUND');
    return NextResponse.json({ order });
  } catch (e) {
    return handleError(e);
  }
}
