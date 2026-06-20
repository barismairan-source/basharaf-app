import { NextResponse } from 'next/server';
import { getCustomerSession } from '@/lib/auth/customerSession';
import { db, schema } from '@/lib/db/client';
import { eq } from 'drizzle-orm';
import { handleError } from '@/lib/api-error';

export async function GET() {
  try {
    const session = await getCustomerSession();
    if (!session) {
      return NextResponse.json({ error: 'احراز هویت لازم است', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const [customer] = await db
      .select()
      .from(schema.webCustomers)
      .where(eq(schema.webCustomers.id, session.customerId))
      .limit(1);

    if (!customer) {
      return NextResponse.json({ error: 'احراز هویت لازم است', code: 'UNAUTHORIZED' }, { status: 401 });
    }

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
