import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { ApiError, handleErrorLogged } from '@/lib/api-error';
import { audit } from '@/lib/auth/audit';
import { getClientIp } from '@/lib/auth/rateLimit';
import { requireMe, requireUnlocked } from '@/lib/staff-panel/session';
import { describeBasis, type StatementBasis, type StatementLine, type StatementWeek } from '@/lib/staff-panel/statements';

export const dynamic = 'force-dynamic';

/** GET /api/me/statements/[id] — جزئیات یک ماه: هفته‌به‌هفته، روزها، مبلغ‌ها و «بر چه اساسی». ماه دیگران → ۴۰۴. */
export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const device = await requireMe();
    await requireUnlocked(device);
    if (!z.string().uuid().safeParse(params.id).success) throw new ApiError(404, 'پیدا نشد', 'NOT_FOUND');
    const [row] = await db.select().from(schema.staffStatements)
      .where(and(eq(schema.staffStatements.id, params.id), eq(schema.staffStatements.employeeId, device.employeeId))).limit(1);
    if (!row) throw new ApiError(404, 'پیدا نشد', 'NOT_FOUND');
    const basis = row.basis as StatementBasis;
    void audit({ action: 'staff.payslip.viewed', ip: getClientIp(req), meta: { employeeId: device.employeeId, statementId: row.id } });
    return NextResponse.json({
      statement: {
        id: row.id, period: row.periodYearMonth, model: row.model, title: row.title, total: Number(row.totalAmount),
        basisText: describeBasis(basis), basis,
        weeks: row.weeks as StatementWeek[], lines: row.lines as StatementLine[], notes: row.notes as string[],
      },
    });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
