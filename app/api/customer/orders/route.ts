import { NextResponse } from 'next/server';
import { requireCustomer, CustomerUnauthorizedError } from '@/lib/auth/customerSession';
import { getWebCustomerOrders } from '@/lib/ordering/webCustomer';
import { handleError } from '@/lib/api-error';

export async function GET() {
  try {
    const session = await requireCustomer();
    const orders = await getWebCustomerOrders(session.customerId);
    return NextResponse.json({ orders });
  } catch (err) {
    if (err instanceof CustomerUnauthorizedError) {
      return NextResponse.json({ error: 'احراز هویت لازم است', code: 'UNAUTHORIZED' }, { status: 401 });
    }
    return handleError(err);
  }
}
