import { NextResponse } from 'next/server';
import { requireCustomer, CustomerUnauthorizedError } from '@/lib/auth/customerSession';
import { getWebCustomerOrders } from '@/lib/ordering/webCustomer';

export async function GET() {
  try {
    const session = await requireCustomer();
    const orders = await getWebCustomerOrders(session.customerId);
    return NextResponse.json({ orders });
  } catch (err) {
    if (err instanceof CustomerUnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[customer/orders]', err);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
