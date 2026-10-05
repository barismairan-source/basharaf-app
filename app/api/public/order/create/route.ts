import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { ApiError, handleError } from '@/lib/api-error';
import { consumeRequestLimit, getClientIp, PUBLIC_LIMITS } from '@/lib/auth/rateLimit';
import { createPublicOrder } from '@/lib/ordering/publicOrders';
import { getCustomerSession } from '@/lib/auth/customerSession';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  clientToken: z.string().trim().min(8).max(100),
  serviceType: z.enum(['delivery', 'pickup']),
  payMethod: z.enum(['cash', 'online']),
  customerName: z.string().trim().min(2, 'نام را کامل وارد کنید').max(100),
  customerPhone: z.string().trim().min(5, 'شماره تلفن نامعتبر است').max(20),
  address: z.string().trim().max(500).optional(),
  zoneId: z.string().uuid().optional(),
  pickupTime: z.string().trim().max(50).optional(),
  note: z.string().trim().max(500).optional(),
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        qty: z.number().int().positive().max(99),
      })
    )
    .min(1, 'سبد خرید خالی است')
    .max(100, 'تعداد اقلام سبد بیش از حد مجاز است'),
});

/**
 * POST /api/public/order/create — ثبت سفارش بیرون‌بر (عمومی، بدون auth، نقدی یا آنلاین).
 * idempotent با clientToken: درخواست تکراری همان سفارش قبلی را برمی‌گرداند.
 */
export async function POST(req: Request) {
  try {
    const rl = consumeRequestLimit('order-create', getClientIp(req), PUBLIC_LIMITS.orderCreate);
    if (!rl.allowed) {
      throw new ApiError(429, `تعداد درخواست‌ها زیاد است. ${rl.retryAfter ?? 60} ثانیه دیگر تلاش کنید.`, 'RATE_LIMITED');
    }
    const input = bodySchema.parse(await req.json());
    // مشتری واردشده: سفارش به حسابش وصل می‌شود تا در «سفارش‌های من» دیده شود.
    // شناسه فقط از کوکی نشست امضاشده خوانده می‌شود، هرگز از body (وگرنه هر کسی
    // می‌توانست سفارش را به حساب دیگری بچسباند). قبلاً checkout این فیلد را در
    // body می‌فرستاد ولی zod حذفش می‌کرد و هیچ سفارشی وصل نمی‌شد.
    const session = await getCustomerSession().catch(() => null);
    const [customer] = session
      ? await db.select({ id: schema.webCustomers.id }).from(schema.webCustomers)
          .where(eq(schema.webCustomers.id, session.customerId)).limit(1)
      : [];
    const { order, isNew } = await createPublicOrder({ ...input, orderCustomerId: customer?.id });
    return NextResponse.json({ order }, { status: isNew ? 201 : 200 });
  } catch (e) {
    return handleError(e);
  }
}
