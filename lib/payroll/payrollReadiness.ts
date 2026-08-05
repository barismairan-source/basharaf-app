import { and, eq, gte, lte, inArray } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { jalaliMonthRange } from '@/lib/jalali';
import { resolveActiveHourlyRate, findAttendanceOverlap, type AttendanceIntervalInput } from './attendanceEngine';

/**
 * آمادگی محاسبه‌ی حقوق یک دوره — منبع واحد حقیقت، هم برای API گزارش
 * (`GET /api/hr/payroll/readiness`) و هم برای گیت‌های calculate/approve
 * (تا هیچ‌وقت این دو جا از هم جدا نیفتند).
 *
 * تفاوت خطا/هشدار:
 *   criticalErrors → محاسبه/تأیید را مسدود می‌کند.
 *   warnings       → فقط نیازمند مشاهده/تأیید مدیر است، مسدودکننده نیست.
 */

export interface PayrollReadinessResult {
  periodYearMonth: string;
  branchId: string | null;
  activeEmployeeCount: number;
  employeesWithInvalidRate: Array<{ employeeId: string; employeeName: string; reason: string }>;
  draftAttendanceCount: number;
  overlappingAttendanceDays: Array<{ employeeId: string; employeeName: string; workDate: string }>;
  unscheduledAttendanceCount: number;
  unapprovedOvertimeCount: number;
  overlappingRateEmployees: Array<{ employeeId: string; employeeName: string }>;
  missingLegalParams: boolean;
  employeesWithoutAttendance: Array<{ employeeId: string; employeeName: string }>;
  criticalErrors: string[];
  warnings: string[];
  ready: boolean;
}

function emptyResult(periodYearMonth: string, branchId: string | null, criticalErrors: string[]): PayrollReadinessResult {
  return {
    periodYearMonth, branchId, activeEmployeeCount: 0,
    employeesWithInvalidRate: [], draftAttendanceCount: 0, overlappingAttendanceDays: [],
    unscheduledAttendanceCount: 0, unapprovedOvertimeCount: 0, overlappingRateEmployees: [],
    missingLegalParams: false, employeesWithoutAttendance: [], criticalErrors, warnings: [],
    ready: criticalErrors.length === 0,
  };
}

/**
 * هسته‌ی آمادگی — روی یک لیست از پیش‌مشخص‌شده از کارمندان اجرا می‌شود.
 * calculate/route.ts از همین با لیست کارمندان واقعی همان اجرا استفاده می‌کند
 * (که ممکن است با «فعال+این شعبه» دقیقاً یکی نباشد — مثلاً وقتی اجرا قبلاً
 * محاسبه شده و کارمندی بعداً soft-delete شده، طبق رفتار موجود calculate
 * همان کارمندان قبلی را نگه می‌دارد).
 */
export async function computeReadinessForEmployees(
  employees: Array<typeof schema.employees.$inferSelect>,
  periodYearMonth: string,
  branchId?: string | null,
): Promise<PayrollReadinessResult> {
  const range = jalaliMonthRange(periodYearMonth);
  const criticalErrors: string[] = [];
  const warnings: string[] = [];

  if (!range) {
    criticalErrors.push('فرمت دوره نامعتبر است (باید YYYY-MM باشد)');
    return emptyResult(periodYearMonth, branchId ?? null, criticalErrors);
  }

  const jalaliYear = parseInt(periodYearMonth.slice(0, 4), 10);
  const [params] = await db.select().from(schema.payrollParameters).where(eq(schema.payrollParameters.jalaliYear, jalaliYear)).limit(1);
  const missingLegalParams = !params;
  if (missingLegalParams) criticalErrors.push(`پارامترهای قانونی سال ${jalaliYear} تعریف نشده`);

  const empIds = employees.map(e => e.id);
  if (empIds.length === 0) {
    const result = emptyResult(periodYearMonth, branchId ?? null, criticalErrors);
    result.missingLegalParams = missingLegalParams;
    return result;
  }

  const rateRows = await db.select().from(schema.employeeHourlyRates).where(inArray(schema.employeeHourlyRates.employeeId, empIds));
  const ratesByEmployee = new Map<string, typeof rateRows>();
  for (const r of rateRows) {
    const list = ratesByEmployee.get(r.employeeId) ?? [];
    list.push(r);
    ratesByEmployee.set(r.employeeId, list);
  }

  const employeesWithInvalidRate: PayrollReadinessResult['employeesWithInvalidRate'] = [];
  const overlappingRateEmployees: PayrollReadinessResult['overlappingRateEmployees'] = [];
  for (const emp of employees) {
    if (emp.compensationType === 'hourly') {
      const rates = (ratesByEmployee.get(emp.id) ?? []).map(r => ({
        hourlyRate: Number(r.hourlyRate),
        effectiveFrom: r.effectiveFrom.toISOString().slice(0, 10),
        effectiveTo: r.effectiveTo ? r.effectiveTo.toISOString().slice(0, 10) : null,
      }));
      const hasActiveRateInPeriod = rates.some(r => r.effectiveFrom <= range.to && (r.effectiveTo === null || r.effectiveTo >= range.from));
      if (!hasActiveRateInPeriod) {
        employeesWithInvalidRate.push({ employeeId: emp.id, employeeName: emp.fullName, reason: 'بدون نرخ ساعتی فعال در این دوره' });
      }
      // هم‌پوشانی نرخ‌ها (دفاعی — نباید اتفاق بیفتد چون API هنگام ثبت جلوگیری می‌کند)
      const sorted = [...(ratesByEmployee.get(emp.id) ?? [])].sort((a, b) => a.effectiveFrom.getTime() - b.effectiveFrom.getTime());
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1]!, cur = sorted[i]!;
        const prevTo = prev.effectiveTo ? prev.effectiveTo.toISOString().slice(0, 10) : null;
        const curFrom = cur.effectiveFrom.toISOString().slice(0, 10);
        if (prevTo === null || prevTo >= curFrom) {
          overlappingRateEmployees.push({ employeeId: emp.id, employeeName: emp.fullName });
          break;
        }
      }
    } else {
      if (Number(emp.baseMonthlySalary) <= 0) {
        employeesWithInvalidRate.push({ employeeId: emp.id, employeeName: emp.fullName, reason: 'حقوق پایه‌ی ماهانه تعریف نشده' });
      }
    }
  }
  if (employeesWithInvalidRate.length > 0) {
    criticalErrors.push(`${employeesWithInvalidRate.length} نفر نرخ/حقوق پایه‌ی معتبر ندارند`);
  }
  if (overlappingRateEmployees.length > 0) {
    criticalErrors.push(`${overlappingRateEmployees.length} نفر نرخ ساعتی هم‌پوشان دارند`);
  }

  const hourlyEmpIds = employees.filter(e => e.compensationType === 'hourly').map(e => e.id);
  let draftAttendanceCount = 0;
  let unscheduledAttendanceCount = 0;
  let unapprovedOvertimeCount = 0;
  const overlappingAttendanceDays: PayrollReadinessResult['overlappingAttendanceDays'] = [];
  const employeesWithoutAttendance: PayrollReadinessResult['employeesWithoutAttendance'] = [];

  if (hourlyEmpIds.length > 0) {
    const entries = await db.select({
      entry: schema.attendanceEntries,
      assignmentStartTime: schema.employeeShiftAssignments.plannedStartTime,
      assignmentEndTime: schema.employeeShiftAssignments.plannedEndTime,
      assignmentCrossesMidnight: schema.employeeShiftAssignments.crossesMidnight,
    }).from(schema.attendanceEntries)
      .leftJoin(schema.employeeShiftAssignments, eq(schema.attendanceEntries.shiftAssignmentId, schema.employeeShiftAssignments.id))
      .where(and(
        inArray(schema.attendanceEntries.employeeId, hourlyEmpIds),
        gte(schema.attendanceEntries.workDate, new Date(range.from + 'T00:00:00Z')),
        lte(schema.attendanceEntries.workDate, new Date(range.to + 'T00:00:00Z')),
      ));

    draftAttendanceCount = entries.filter(r => r.entry.status === 'draft').length;
    unscheduledAttendanceCount = entries.filter(r => r.entry.shiftAssignmentId === null && r.entry.attendanceType === 'present').length;
    unapprovedOvertimeCount = entries.filter(r => r.entry.overtimeMinutes > 0 && !r.entry.overtimeApproved).length;

    const byEmployeeDay = new Map<string, typeof entries>();
    for (const r of entries) {
      const key = `${r.entry.employeeId}|${r.entry.workDate.toISOString().slice(0, 10)}`;
      const list = byEmployeeDay.get(key) ?? [];
      list.push(r);
      byEmployeeDay.set(key, list);
    }
    const empNameById = new Map(employees.map(e => [e.id, e.fullName]));
    for (const [key, group] of byEmployeeDay) {
      if (group.length < 2) continue;
      const [employeeId, workDate] = key.split('|') as [string, string];
      const intervals: AttendanceIntervalInput[] = group.map(r => ({
        id: r.entry.id, attendanceType: r.entry.attendanceType, entryMode: r.entry.entryMode,
        clockIn: r.entry.clockIn, clockOut: r.entry.clockOut, crossesMidnight: false,
        shiftAssignmentId: r.entry.shiftAssignmentId,
        assignmentStartTime: r.assignmentStartTime, assignmentEndTime: r.assignmentEndTime,
        assignmentCrossesMidnight: r.assignmentCrossesMidnight ?? false,
      }));
      const hasOverlap = intervals.some(candidate => findAttendanceOverlap(candidate, intervals));
      if (hasOverlap) {
        overlappingAttendanceDays.push({ employeeId, employeeName: empNameById.get(employeeId) ?? '—', workDate });
      }
    }

    const employeesWithAnyEntry = new Set(entries.map(r => r.entry.employeeId));
    for (const emp of employees) {
      if (emp.compensationType === 'hourly' && !employeesWithAnyEntry.has(emp.id)) {
        employeesWithoutAttendance.push({ employeeId: emp.id, employeeName: emp.fullName });
      }
    }
  }

  if (draftAttendanceCount > 0) criticalErrors.push(`${draftAttendanceCount} رکورد حضور هنوز تأیید نشده`);
  if (overlappingAttendanceDays.length > 0) criticalErrors.push(`${overlappingAttendanceDays.length} روز حضور هم‌پوشان یافت شد`);
  if (unscheduledAttendanceCount > 0) warnings.push(`${unscheduledAttendanceCount} حضور بدون شیفت برنامه‌ریزی‌شده`);
  if (unapprovedOvertimeCount > 0) warnings.push(`${unapprovedOvertimeCount} اضافه‌کاری تأییدنشده`);
  if (employeesWithoutAttendance.length > 0) warnings.push(`${employeesWithoutAttendance.length} کارمند ساعتی بدون هیچ حضوری در این دوره`);

  return {
    periodYearMonth, branchId: branchId ?? null, activeEmployeeCount: employees.length,
    employeesWithInvalidRate, draftAttendanceCount, overlappingAttendanceDays,
    unscheduledAttendanceCount, unapprovedOvertimeCount, overlappingRateEmployees,
    missingLegalParams, employeesWithoutAttendance, criticalErrors, warnings,
    ready: criticalErrors.length === 0,
  };
}

/** لایه‌ی نازک برای API عمومی — کارمندان فعال شعبه را خودش resolve می‌کند. */
export async function computePayrollReadiness(periodYearMonth: string, branchId?: string | null): Promise<PayrollReadinessResult> {
  const empWhere = branchId
    ? and(eq(schema.employees.isActive, true), eq(schema.employees.branchId, branchId))
    : eq(schema.employees.isActive, true);
  const employees = await db.select().from(schema.employees).where(empWhere);
  return computeReadinessForEmployees(employees, periodYearMonth, branchId);
}
