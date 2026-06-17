import { NextResponse } from 'next/server';
import { avg, count, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';

export async function GET() {
  try {
    const session = await requireSession();
    if (session.role !== 'SuperAdmin' && !session.branchId) {
      return NextResponse.json({ summary: [] });
    }

    const where =
      session.role === 'SuperAdmin'
        ? undefined
        : eq(schema.feedback.branchId, session.branchId as string);

    const rows = await db
      .select({
        branchId: schema.feedback.branchId,
        average: avg(schema.feedback.rating),
        cnt: count(),
      })
      .from(schema.feedback)
      .where(where)
      .groupBy(schema.feedback.branchId);

    const summary = rows.map((r) => ({
      branchId: r.branchId,
      average: r.average == null ? 0 : Math.round(Number(r.average) * 10) / 10,
      count: Number(r.cnt),
    }));

    return NextResponse.json({ summary });
  } catch (e) {
    return handleError(e);
  }
}
