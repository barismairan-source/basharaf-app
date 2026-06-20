import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCustomer, CustomerUnauthorizedError } from '@/lib/auth/customerSession';
import { updateWebCustomerAddress, deleteWebCustomerAddress } from '@/lib/ordering/webCustomer';
import { ApiError, handleError } from '@/lib/api-error';

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
    if (!updated) throw new ApiError(404, 'آدرس یافت نشد', 'NOT_FOUND');
    return NextResponse.json({ address: updated });
  } catch (err) {
    if (err instanceof CustomerUnauthorizedError) {
      return NextResponse.json({ error: 'احراز هویت لازم است', code: 'UNAUTHORIZED' }, { status: 401 });
    }
    return handleError(err);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireCustomer();
    const deleted = await deleteWebCustomerAddress(session.customerId, params.id);
    if (!deleted) throw new ApiError(404, 'آدرس یافت نشد', 'NOT_FOUND');
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof CustomerUnauthorizedError) {
      return NextResponse.json({ error: 'احراز هویت لازم است', code: 'UNAUTHORIZED' }, { status: 401 });
    }
    return handleError(err);
  }
}
