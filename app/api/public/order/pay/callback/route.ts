import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { getPaymentGateway } from '@/lib/payments';

export const dynamic = 'force-dynamic';

/**
 * GET /api/public/order/pay/callback — بازگشت از درگاه Zarinpal (Authority, Status).
 * idempotent: اگر سفارش قبلاً paid شده، دوباره verify نمی‌شود.
 * مبلغ verify همیشه order.total سمت سرور است (نه مقداری از کلاینت) — ضد دستکاری.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const authority = url.searchParams.get('Authority');
  const status = url.searchParams.get('Status');

  if (!authority) {
    return NextResponse.redirect(new URL('/order', req.url));
  }

  const [order] = await db.select().from(schema.orders)
    .where(eq(schema.orders.payAuthority, authority)).limit(1);
  if (!order) {
    return NextResponse.redirect(new URL('/order', req.url));
  }

  const trackUrl = new URL(`/order/track/${order.trackToken}`, req.url);

  // idempotent — اگر قبلاً تایید شده، دوباره verify نکن و رکورد تکراری نساز
  if (order.payStatus === 'paid') {
    return NextResponse.redirect(trackUrl);
  }

  if (status !== 'OK') {
    if (order.payStatus !== 'failed') {
      await db.transaction(async (tx) => {
        await tx.update(schema.orders)
          .set({ payStatus: 'failed' })
          .where(eq(schema.orders.id, order.id));
        await tx.insert(schema.orderEvents).values({
          orderId: order.id,
          fromStatus: order.status,
          toStatus: order.status,
          note: 'پرداخت آنلاین لغو یا ناموفق شد',
        });
      });
    }
    return NextResponse.redirect(trackUrl);
  }

  const gateway = getPaymentGateway();
  let result;
  try {
    result = await gateway.verify(authority, order.total);
  } catch {
    result = { ok: false as const, message: 'خطا در ارتباط با درگاه پرداخت' };
  }

  await db.transaction(async (tx) => {
    if (result.ok) {
      await tx.update(schema.orders)
        .set({ payStatus: 'paid', payRef: result.refId ?? null })
        .where(eq(schema.orders.id, order.id));
      await tx.insert(schema.orderEvents).values({
        orderId: order.id,
        fromStatus: order.status,
        toStatus: order.status,
        note: `پرداخت آنلاین موفق — کد پیگیری: ${result.refId ?? '-'}`,
      });
    } else {
      await tx.update(schema.orders)
        .set({ payStatus: 'failed' })
        .where(eq(schema.orders.id, order.id));
      await tx.insert(schema.orderEvents).values({
        orderId: order.id,
        fromStatus: order.status,
        toStatus: order.status,
        note: `پرداخت آنلاین ناموفق — ${result.message ?? ''}`,
      });
    }
  });

  return NextResponse.redirect(trackUrl);
}
