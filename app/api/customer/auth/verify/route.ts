import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyWebOtp } from '@/lib/ordering/webCustomer';
import { setCustomerSession } from '@/lib/auth/customerSession';

const schema = z.object({
  phone: z.string(),
  code: z.string().length(6),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());

    const customer = await verifyWebOtp(body.phone, body.code);
    if (!customer) {
      return NextResponse.json(
        { error: 'کد نامعتبر یا منقضی شده است' },
        { status: 422 }
      );
    }

    await setCustomerSession(customer.id, customer.phone);

    return NextResponse.json({
      customer: {
        id: customer.id,
        phone: customer.phone,
        name: customer.name,
        createdAt: customer.createdAt,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'داده‌های ورودی نامعتبر است' }, { status: 422 });
    }
    console.error('[verify-otp]', err);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
