import { NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';

/** GET /api/contacts/[id]/cheques — چک‌های مرتبط با یک طرف‌حساب */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();

    const clauses = [eq(schema.cheques.contactId, params.id)];
    if (session.role === 'BranchUser' && session.branchId)
      clauses.push(eq(schema.cheques.branchId, session.branchId));

    const rows = await db
      .select()
      .from(schema.cheques)
      .where(and(...clauses))
      .orderBy(desc(schema.cheques.dueDateJalali))
      .limit(20);

    const cheques = rows.map((r) => ({
      id: r.id,
      kind: r.kind as 'received' | 'issued',
      amount: Number(r.amount),
      serialNo: r.serialNo,
      bankName: r.bankName,
      dueDateJalali: r.dueDateJalali,
      status: r.status,
    }));

    return NextResponse.json({ cheques });
  } catch (e) {
    return handleError(e);
  }
}
