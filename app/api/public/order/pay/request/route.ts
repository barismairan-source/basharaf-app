import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { ApiError, handleError } from '@/lib/api-error';
import { getPaymentGateway } from '@/lib/payments';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  trackToken: z.string().uuid(),
});

/**
 * POST /api/public/order/pay/request — شروع پرداخت آنلاین برای سفارشی که
 * قبلاً با pay_method='online' و pay_status='unpaid'/'failed' ثبت شده.
 * authority برگشتی روی سفارش ذخیره می‌شود تا callback آن را پیدا کند.
 */
export async function POST(req: Request) {
  try {
    const { trackToken } = bodySchema.parse(await req.json());

    const [order] = await db.select().from(schema.orders)
      .where(eq(schema.orders.trackToken, trackToken)).limit(1);
    if (!order) throw new ApiError(404, 'سفارش پیدا نشد', 'ORDER_NOT_FOUND');
    if (order.payMethod !== 'online') {
      throw new ApiError(422, 'این سفارش با پرداخت نقدی ثبت شده است', 'NOT_ONLINE');
    }
    if (order.payStatus === 'paid') {
      throw new ApiError(422, 'این سفارش قبلاً پرداخت شده است', 'ALREADY_PAID');
    }

    const callbackUrl = new URL('/api/public/order/pay/callback', req.url).toString();
    const gateway = getPaymentGateway();
    const { url, authority } = await gateway.request(order.total, order.id, callbackUrl);

    await db.update(schema.orders)
      .set({ payAuthority: authority })
      .where(eq(schema.orders.id, order.id));

    return NextResponse.json({ url });
  } catch (e) {
    return handleError(e);
  }
}
