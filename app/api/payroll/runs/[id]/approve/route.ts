import { NextResponse } from 'next/server';
import { and, eq, gte, lte, inArray } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleErrorLogged } from '@/lib/api-error';
import { jalaliMonthRange } from '@/lib/jalali';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAdmin();
    const now = new Date();

    // جلوگیری از تأیید دوره‌ای که برای کارمندان ساعتی هنوز حضور تأییدنشده (draft) دارد
    const [runForCheck] = await db.select().from(schema.payrollRuns).where(eq(schema.payrollRuns.id, params.id)).limit(1);
    if (runForCheck) {
      const payslipEmployeeIds = (await db.select({ employeeId: schema.payslips.employeeId })
        .from(schema.payslips).where(eq(schema.payslips.payrollRunId, params.id))).map(r => r.employeeId);
      const range = jalaliMonthRange(runForCheck.periodYearMonth);
      if (payslipEmployeeIds.length > 0 && range) {
        const draftRows = await db.select({ employeeId: schema.attendanceEntries.employeeId })
          .from(schema.attendanceEntries)
          .where(and(
            inArray(schema.attendanceEntries.employeeId, payslipEmployeeIds),
            gte(schema.attendanceEntries.workDate, new Date(range.from + 'T00:00:00Z')),
            lte(schema.attendanceEntries.workDate, new Date(range.to + 'T00:00:00Z')),
            eq(schema.attendanceEntries.status, 'draft'),
          ));
        if (draftRows.length > 0) {
          throw new ApiError(409, 'این دوره حضور تأییدنشده دارد — ابتدا همه‌ی حضورها را تأیید کنید', 'UNCONFIRMED_ATTENDANCE');
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
