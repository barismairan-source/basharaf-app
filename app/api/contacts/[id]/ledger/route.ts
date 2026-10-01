import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { assertSection, branchScope } from '@/lib/auth/apiAccess';
import { ApiError, handleError } from '@/lib/api-error';
import { getContactLedger } from '@/lib/db/contactLedger';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession();
    assertSection(session, 'contacts');
    // غیر SuperAdmin: فقط ردیف‌های شعبه‌ی خودش (طرف‌حساب سراسری است، تراکنش‌ها شعبه‌ای‌اند)
    const scope = branchScope(session);

    const [contact] = await db
      .select()
      .from(schema.contacts)
      .where(eq(schema.contacts.id, params.id))
      .limit(1);

    if (!contact) throw new ApiError(404, 'طرف‌حساب یافت نشد', 'CONTACT_NOT_FOUND');

    const { entries, balance } = await getContactLedger(params.id, scope);

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
