import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCustomer, CustomerUnauthorizedError } from '@/lib/auth/customerSession';
import { getWebCustomerAddresses, addWebCustomerAddress } from '@/lib/ordering/webCustomer';

const addSchema = z.object({
  title: z.string().min(1).max(100),
  address: z.string().min(5).max(500),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  isDefault: z.boolean().optional(),
});

export async function GET() {
  try {
    const session = await requireCustomer();
    const addresses = await getWebCustomerAddresses(session.customerId);
    return NextResponse.json({ addresses });
  } catch (err) {
    if (err instanceof CustomerUnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[customer/addresses GET]', err);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireCustomer();
    const body = addSchema.parse(await request.json());
    const address = await addWebCustomerAddress(session.customerId, body);
    return NextResponse.json({ address }, { status: 201 });
  } catch (err) {
    if (err instanceof CustomerUnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'داده‌های ورودی نامعتبر است' }, { status: 422 });
    }
    console.error('[customer/addresses POST]', err);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
