import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createWebOtp, isValidIranPhone } from '@/lib/ordering/webCustomer';
import { ApiError } from '@/lib/api-error';

const schema = z.object({
  phone: z.string(),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());

    if (!isValidIranPhone(body.phone)) {
      return NextResponse.json(
        { error: 'شماره موبایل نامعتبر است — ۱۱ رقم و شروع با ۰' },
        { status: 422 }
      );
    }

    await createWebOtp(body.phone);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'داده‌های ورودی نامعتبر است' }, { status: 422 });
    }
    console.error('[send-otp]', err);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
