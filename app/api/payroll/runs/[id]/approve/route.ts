import { NextResponse } from 'next/server';
import { and, eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleErrorLogged } from '@/lib/api-error';
import { computeReadinessForEmployees } from '@/lib/payroll/payrollReadiness';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAdmin();
    const now = new Date();

    // جلوگیری از تأیید دوره‌ی دارای خطای بحرانی (حضور تأییدنشده، هم‌پوشانی، نرخ نامعتبر، ...)
    // — همان گیت آمادگی‌ی که calculate استفاده می‌کند، تا این دو جا هرگز از هم جدا نیفتند.
    const [runForCheck] = await db.select().from(schema.payrollRuns).where(eq(schema.payrollRuns.id, params.id)).limit(1);
    if (runForCheck) {
      const payslipEmployeeIds = (await db.select({ employeeId: schema.payslips.employeeId })
        .from(schema.payslips).where(eq(schema.payslips.payrollRunId, params.id))).map(r => r.employeeId);
      if (payslipEmployeeIds.length > 0) {
        const employees = await db.select().from(schema.employees).where(inArray(schema.employees.id, payslipEmployeeIds));
        const readiness = await computeReadinessForEmployees(employees, runForCheck.periodYearMonth, runForCheck.branchId);
        if (!readiness.ready) {
          throw new ApiError(409, `این دوره آماده‌ی تأیید نیست: ${readiness.criticalErrors.join('؛ ')}`, 'NOT_READY', {
            criticalErrors: readiness.criticalErrors, warnings: readiness.warnings,
          });
        }
      }
    }

    const updated = await db.transaction(async (dbTx) => {
      // قفل ردیف داخل transaction — جلوگیری از تأیید همزمان (SELECT FOR UPDATE)
      const [run] = await dbTx.select({ status: schema.payrollRuns.status })
        .from(schema.payrollRuns).where(eq(schema.payrollRuns.id, params.id)).for('update');
      if (!run) throw new ApiError(404, 'اجرا پیدا نشد', 'NOT_FOUND');
      if (run.status !== 'calculated')
        throw new ApiError(409, 'فقط اجرای محاسبه‌شده قابل تأیید است', 'BAD_STATE');

      const [u] = await dbTx.update(schema.payrollRuns)
        .set({ status: 'approved', approvedBy: session.sub, approvedAt: now })
        .where(and(eq(schema.payrollRuns.id, params.id), eq(schema.payrollRuns.status, 'calculated')))
        .returning({ status: schema.payrollRuns.status });
      return u;
    });

    return NextResponse.json({ ok: true, status: updated?.status });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
