import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyWebOtp } from '@/lib/ordering/webCustomer';
import { setCustomerSession } from '@/lib/auth/customerSession';
import { ApiError, handleError } from '@/lib/api-error';

const schema = z.object({
  phone: z.string(),
  code: z.string().length(6),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());

    const customer = await verifyWebOtp(body.phone, body.code);
    if (!customer) {
      throw new ApiError(422, 'کد نامعتبر یا منقضی شده است', 'INVALID_OTP');
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
    return handleError(err);
  }
}
