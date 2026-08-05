import { NextResponse } from 'next/server';
import { and, eq, gte, lte, inArray } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleErrorLogged } from '@/lib/api-error';
import { jalaliMonthRange } from '@/lib/jalali';
import { calcAttendancePay } from '@/lib/payroll/attendanceEngine';

export const dynamic = 'force-dynamic';

const periodRe = /^\d{4}-\d{2}$/;

/**
 * GET /api/hr/time/timesheet?period=1405-05&branchId=...
 * گزارش کارکرد — خلاصه‌ی هر فرد در دوره: برنامه‌ریزی‌شده/واقعی/عادی/
 * اضافه‌کاری/شب‌کاری/تعطیل‌کاری/مرخصی/غیبت/کسری/مبلغ تخمینی/وضعیت تکمیل.
 * فقط از رکوردهای تأییدشده/قفل‌شده محاسبه می‌شود (draft هرگز وارد مبلغ نمی‌شود).
 */
export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const period = url.searchParams.get('period');
    const branchId = url.searchParams.get('branchId');
    if (!period || !periodRe.test(period)) throw new ApiError(400, 'پارامتر period (YYYY-MM) الزامی است', 'MISSING_PERIOD');
    const range = jalaliMonthRange(period);
    if (!range) throw new ApiError(400, 'فرمت دوره نامعتبر است', 'BAD_PERIOD');

    const [params] = await db.select().from(schema.payrollParameters)
      .where(eq(schema.payrollParameters.jalaliYear, parseInt(period.slice(0, 4), 10))).limit(1);
    const overtimeMultiplier = params ? Number(params.overtimeMultiplier) : 1.4;
    const nightMultiplier = params ? Number(params.nightShiftPremium) : 1.35;
    const holidayMultiplier = params ? Number(params.holidayMultiplier) : 1.4;

    const empWhere = branchId
      ? and(eq(schema.employees.isActive, true), eq(schema.employees.branchId, branchId), eq(schema.employees.compensationType, 'hourly'))
      : and(eq(schema.employees.isActive, true), eq(schema.employees.compensationType, 'hourly'));
    const employees = await db.select().from(schema.employees).where(empWhere);
    const empIds = employees.map(e => e.id);

    const entries = empIds.length > 0
      ? await db.select().from(schema.attendanceEntries).where(and(
          inArray(schema.attendanceEntries.employeeId, empIds),
          gte(schema.attendanceEntries.workDate, new Date(range.from + 'T00:00:00Z')),
          lte(schema.attendanceEntries.workDate, new Date(range.to + 'T00:00:00Z')),
        ))
      : [];

    const assignments = empIds.length > 0
      ? await db.select().from(schema.employeeShiftAssignments).where(and(
          inArray(schema.employeeShiftAssignments.employeeId, empIds),
          gte(schema.employeeShiftAssignments.workDate, new Date(range.from + 'T00:00:00Z')),
          lte(schema.employeeShiftAssignments.workDate, new Date(range.to + 'T00:00:00Z')),
          eq(schema.employeeShiftAssignments.status, 'scheduled'),
        ))
      : [];
    const plannedByEmployee = new Map<string, number>();
    for (const a of assignments) {
      plannedByEmployee.set(a.employeeId, (plannedByEmployee.get(a.employeeId) ?? 0) + a.plannedMinutes);
    }

    const rows = employees.map(emp => {
      const empEntries = entries.filter(e => e.employeeId === emp.id);
      const payable = empEntries.filter(e => e.status === 'confirmed' || e.status === 'locked');

      let regularMinutes = 0, overtimeMinutes = 0, nightMinutes = 0, holidayMinutes = 0, workedMinutes = 0, estimatedAmount = 0;
      let paidLeaveMinutes = 0, unpaidLeaveMinutes = 0, absentDays = 0;
      for (const e of payable) {
        if (e.attendanceType === 'paid_leave') { paidLeaveMinutes += e.workedMinutes; continue; }
        if (e.attendanceType === 'unpaid_leave' || e.attendanceType === 'sick_leave') { unpaidLeaveMinutes += e.workedMinutes; continue; }
        if (e.attendanceType === 'absent') { absentDays += 1; continue; }
        workedMinutes += e.workedMinutes;
        regularMinutes += e.regularMinutes;
        nightMinutes += e.nightMinutes;
        holidayMinutes += e.holidayMinutes;
        const approvedOvertime = e.overtimeApproved ? e.overtimeMinutes : 0;
        overtimeMinutes += approvedOvertime;
        const pay = calcAttendancePay({
          regularMinutes: e.regularMinutes, overtimeMinutes: approvedOvertime,
          nightMinutes: e.nightMinutes, holidayMinutes: e.holidayMinutes,
          hourlyRate: Number(e.hourlyRateSnapshot), overtimeMultiplier, nightMultiplier, holidayMultiplier,
        });
        estimatedAmount += pay.totalPay;
      }
      const plannedMinutes = plannedByEmployee.get(emp.id) ?? 0;
      const shortfallMinutes = Math.max(0, plannedMinutes - workedMinutes);
      const hasDraft = empEntries.some(e => e.status === 'draft');

      return {
        employeeId: emp.id, employeeName: emp.fullName,
        plannedMinutes, workedMinutes, regularMinutes, overtimeMinutes, nightMinutes, holidayMinutes,
        paidLeaveMinutes, unpaidLeaveMinutes, absentDays, shortfallMinutes, estimatedAmount,
        complete: !hasDraft,
      };
    });

    return NextResponse.json({ period, rows });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
