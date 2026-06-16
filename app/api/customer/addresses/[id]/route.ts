import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCustomer, CustomerUnauthorizedError } from '@/lib/auth/customerSession';
import { updateWebCustomerAddress, deleteWebCustomerAddress } from '@/lib/ordering/webCustomer';

const patchSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  address: z.string().min(5).max(500).optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  isDefault: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireCustomer();
    const body = patchSchema.parse(await request.json());
    const updated = await updateWebCustomerAddress(session.customerId, params.id, body);
    if (!updated) {
      return NextResponse.json({ error: 'آدرس یافت نشد' }, { status: 404 });
    }
    return NextResponse.json({ address: updated });
  } catch (err) {
    if (err instanceof CustomerUnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'داده‌های ورودی نامعتبر است' }, { status: 422 });
    }
    console.error('[customer/addresses PATCH]', err);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireCustomer();
    const deleted = await deleteWebCustomerAddress(session.customerId, params.id);
    if (!deleted) {
      return NextResponse.json({ error: 'آدرس یافت نشد' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof CustomerUnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[customer/addresses DELETE]', err);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
