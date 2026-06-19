import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { getContactLedger } from '@/lib/db/contactLedger';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireSession();

    const [contact] = await db
      .select()
      .from(schema.contacts)
      .where(eq(schema.contacts.id, params.id))
      .limit(1);

    if (!contact) throw new ApiError(404, 'طرف‌حساب یافت نشد', 'CONTACT_NOT_FOUND');

    const { entries, balance } = await getContactLedger(params.id);

    return NextResponse.json({
      contact: {
        id: contact.id,
        name: contact.name,
        type: contact.type,
        phone: contact.phone,
      },
      balance,
      entries,
    });
  } catch (e) {
    return handleError(e);
  }
}
