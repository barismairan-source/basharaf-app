import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { assertBranch, assertCan } from '@/lib/auth/apiAccess';
import { ApiError, handleErrorLogged } from '@/lib/api-error';
import { describeBasis, type StatementBasis, type StatementLine, type StatementWeek } from '@/lib/staff-panel/statements';

export const dynamic = 'force-dynamic';

/**
 * GET /api/hr/staff-overview/[statementId] — ریز کارکرد و محاسبه‌ی یک ماهِ یک نفر برای مدیر؛
 * دقیقاً همان چیزی که خود فرد در پنلش می‌بیند. فقط با hr.compensation.view و محدوده‌ی شعبه.
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    assertCan(session, 'hr.compensation.view');
    if (!z.string().uuid().safeParse(params.id).success) throw new ApiError(404, 'پیدا نشد', 'NOT_FOUND');
    const [row] = await db.select({ s: schema.staffStatements, branchId: schema.employees.branchId, fullName: schema.employees.fullName })
      .from(schema.staffStatements)
      .innerJoin(schema.employees, eq(schema.staffStatements.employeeId, schema.employees.id))
      .where(and(eq(schema.staffStatements.id, params.id))).limit(1);
    if (!row) throw new ApiError(404, 'پیدا نشد', 'NOT_FOUND');
    assertBranch(session, row.branchId);
    const s = row.s;
    return NextResponse.json({
      fullName: row.fullName,
      statement: {
        id: s.id, period: s.periodYearMonth, model: s.model, title: s.title, total: Number(s.totalAmount),
        basisText: describeBasis(s.basis as StatementBasis), basis: s.basis,
        weeks: s.weeks as StatementWeek[], lines: s.lines as StatementLine[], notes: s.notes as string[],
      },
    });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
