import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireSession, requireRole } from '@/lib/auth/session';
import { ApiError, handleErrorLogged } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireSession();
    const [run] = await db.select().from(schema.payrollRuns).where(eq(schema.payrollRuns.id, params.id)).limit(1);
    if (!run) throw new ApiError(404, 'اجرا پیدا نشد', 'NOT_FOUND');

    const slips = await db.select({
      id: schema.payslips.id,
      employeeId: schema.payslips.employeeId,
      employeeName: schema.employees.fullName,
      grossEarnings: schema.payslips.grossEarnings,
      insuranceEmployee: schema.payslips.insuranceEmployee,
      incomeTax: schema.payslips.incomeTax,
      totalDeductions: schema.payslips.totalDeductions,
      netPay: schema.payslips.netPay,
      workedDays: schema.payslips.workedDays,
      calcSnapshot: schema.payslips.calcSnapshot,
    })
      .from(schema.payslips)
      .leftJoin(schema.employees, eq(schema.payslips.employeeId, schema.employees.id))
      .where(eq(schema.payslips.payrollRunId, params.id));

    return NextResponse.json({
      run: {
        id: run.id, periodYearMonth: run.periodYearMonth,
        branchId: run.branchId, branchName: run.branchName, status: run.status,
        calculatedAt: run.calculatedAt?.toISOString() ?? null,
        approvedAt: run.approvedAt?.toISOString() ?? null,
        postedToBasharafAt: run.postedToBasharafAt?.toISOString() ?? null,
      },
      payslips: slips.map(s => {
        const snap = (s.calcSnapshot ?? {}) as { lines?: Array<{ category: string; code: string; labelFa: string; amount: number }> };
        const deductionLines = (snap.lines ?? [])
          .filter(l => l.category === 'deduction' || (l.category === 'statutory' && l.code !== 'insurance_employer'))
          .map(l => ({ label: l.labelFa, amount: l.amount }));
        return {
          id: s.id, employeeId: s.employeeId, employeeName: s.employeeName ?? '—',
          grossEarnings: Number(s.grossEarnings),
          insuranceEmployee: Number(s.insuranceEmployee),
          incomeTax: Number(s.incomeTax),
          totalDeductions: Number(s.totalDeductions),
          netPay: Number(s.netPay),
          workedDays: Number(s.workedDays),
          deductionLines,
        };
      }),
    });
  } catch (e) {
    return await handleErrorLogged(e, undefined, { category: 'payroll' });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole('SuperAdmin');
    const [run] = await db.select().from(schema.payrollRuns)
      .where(eq(schema.payrollRuns.id, params.id)).limit(1);
    if (!run) throw new ApiError(404, 'اجرا پیدا نشد', 'NOT_FOUND');
    if (run.status !== 'draft') throw new ApiError(409, 'فقط اجرای پیش‌نویس قابل حذف است', 'NOT_DRAFT');
    await db.transaction(async (tx) => {
      await tx.delete(schema.payslips).where(eq(schema.payslips.payrollRunId, params.id));
      await tx.delete(schema.payrollRuns).where(eq(schema.payrollRuns.id, params.id));
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return await handleErrorLogged(e, undefined, { category: 'payroll' });
  }
}
