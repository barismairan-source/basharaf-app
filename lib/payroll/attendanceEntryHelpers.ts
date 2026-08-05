import { db, schema } from '@/lib/db/client';
import { eq, and, ne } from 'drizzle-orm';
import { ApiError } from '@/lib/api-error';
import {
  resolveTotalPresenceMinutes, applyBreakPolicy, splitRegularOvertime,
  deriveHolidayMinutes, resolveNightMinutes, resolveActiveHourlyRate,
  findAttendanceOverlap, type AttendanceIntervalInput,
  type AttendanceType, type BreakPolicy, type EntryMode,
} from './attendanceEngine';

// همان الگوی lib/db/balanceHelpers.ts — تابع باید هم با db اصلی و هم با
// tx داخل db.transaction(...) کار کند؛ تایپ دقیق drizzle transaction اینجا
// مفید نیست (فقط select/insert/update لازم است).
type DbOrTx = any;

/**
 * جلوگیری از هم‌پوشانی حضور — درون transaction فراخوانی شود (نه فقط UI).
 * رکورد جدید/ویرایش‌شده را با بقیه‌ی حضورهای همان کارمند در همان روز مقایسه
 * می‌کند؛ در صورت تضاد، ApiError(409) می‌اندازد.
 */
export async function assertNoAttendanceOverlap(
  tx: DbOrTx,
  candidate: AttendanceIntervalInput,
  employeeId: string,
  workDate: string,
): Promise<void> {
  const siblings = await tx.select({
    entry: schema.attendanceEntries,
    assignmentStartTime: schema.employeeShiftAssignments.plannedStartTime,
    assignmentEndTime: schema.employeeShiftAssignments.plannedEndTime,
    assignmentCrossesMidnight: schema.employeeShiftAssignments.crossesMidnight,
  }).from(schema.attendanceEntries)
    .leftJoin(schema.employeeShiftAssignments, eq(schema.attendanceEntries.shiftAssignmentId, schema.employeeShiftAssignments.id))
    .where(and(
      eq(schema.attendanceEntries.employeeId, employeeId),
      eq(schema.attendanceEntries.workDate, new Date(workDate + 'T00:00:00Z')),
      ne(schema.attendanceEntries.id, candidate.id),
    ));

  const others: AttendanceIntervalInput[] = siblings.map((s: any) => ({
    id: s.entry.id, attendanceType: s.entry.attendanceType, entryMode: s.entry.entryMode,
    clockIn: s.entry.clockIn, clockOut: s.entry.clockOut, crossesMidnight: false,
    shiftAssignmentId: s.entry.shiftAssignmentId,
    assignmentStartTime: s.assignmentStartTime, assignmentEndTime: s.assignmentEndTime,
    assignmentCrossesMidnight: s.assignmentCrossesMidnight ?? false,
  }));

  if (findAttendanceOverlap(candidate, others)) {
    throw new ApiError(409, 'این بازه با یک رکورد حضور دیگر در همان روز هم‌پوشانی دارد', 'ATTENDANCE_OVERLAP');
  }
}

/**
 * آیا این کارمند در این روز شیفت برنامه‌ریزی‌شده‌ی فعال دارد؟ برای هشدار
 * «حضور بدون شیفت وقتی شیفت فعال هست» — مسدودکننده نیست، فقط هشدار.
 */
export async function hasActiveShiftAssignment(tx: DbOrTx, employeeId: string, workDate: string): Promise<boolean> {
  const [row] = await tx.select({ id: schema.employeeShiftAssignments.id }).from(schema.employeeShiftAssignments)
    .where(and(
      eq(schema.employeeShiftAssignments.employeeId, employeeId),
      eq(schema.employeeShiftAssignments.workDate, new Date(workDate + 'T00:00:00Z')),
      eq(schema.employeeShiftAssignments.status, 'scheduled'),
    )).limit(1);
  return !!row;
}

/**
 * محاسبه‌ی مشتقات یک روز حضور (worked/regular/overtime/night/holiday/rate).
 * همیشه سمت سرور دوباره محاسبه می‌شود — هرگز به مقادیر مالی کلاینت اعتماد نمی‌شود.
 * استفاده در POST/PATCH هر دو مسیر attendance.
 */
export async function computeDerivedFields(input: {
  employeeId: string; workDate: string; entryMode: EntryMode;
  clockIn?: string | null; clockOut?: string | null; crossesMidnight: boolean;
  manualWorkedMinutes?: number | null; breakMinutes: number; breakPolicy: BreakPolicy;
  attendanceType: AttendanceType; plannedMinutes: number;
}) {
  const rateRows = await db.select().from(schema.employeeHourlyRates)
    .where(eq(schema.employeeHourlyRates.employeeId, input.employeeId));
  const rates = rateRows.map(r => ({
    hourlyRate: Number(r.hourlyRate),
    effectiveFrom: r.effectiveFrom.toISOString().slice(0, 10),
    effectiveTo: r.effectiveTo ? r.effectiveTo.toISOString().slice(0, 10) : null,
  }));
  const hourlyRateSnapshot = resolveActiveHourlyRate(rates, input.workDate);
  if (hourlyRateSnapshot === null) {
    throw new ApiError(400, 'برای این کارمند در این تاریخ نرخ ساعتی فعالی تعریف نشده', 'NO_ACTIVE_RATE');
  }

  if (input.attendanceType === 'paid_leave') {
    const workedMinutes = input.manualWorkedMinutes ?? 0;
    return { workedMinutes, regularMinutes: 0, overtimeMinutes: 0, nightMinutes: 0, holidayMinutes: 0, hourlyRateSnapshot };
  }
  if (input.attendanceType === 'unpaid_leave' || input.attendanceType === 'sick_leave') {
    return {
      workedMinutes: input.manualWorkedMinutes ?? 0, regularMinutes: 0, overtimeMinutes: 0,
      nightMinutes: 0, holidayMinutes: 0, hourlyRateSnapshot,
    };
  }
  if (input.attendanceType === 'absent') {
    return { workedMinutes: 0, regularMinutes: 0, overtimeMinutes: 0, nightMinutes: 0, holidayMinutes: 0, hourlyRateSnapshot };
  }

  const totalPresence = resolveTotalPresenceMinutes({
    entryMode: input.entryMode, clockIn: input.clockIn, clockOut: input.clockOut,
    crossesMidnight: input.crossesMidnight, manualWorkedMinutes: input.manualWorkedMinutes,
  });
  const workedMinutes = applyBreakPolicy(totalPresence, input.breakMinutes, input.breakPolicy);
  const holidayMinutes = deriveHolidayMinutes(input.attendanceType, workedMinutes);
  const { regularMinutes, overtimeMinutes } = holidayMinutes > 0
    ? { regularMinutes: 0, overtimeMinutes: 0 }
    : splitRegularOvertime(workedMinutes, input.plannedMinutes);
  const nightMinutes = input.entryMode === 'time_range' && input.clockIn && input.clockOut
    ? resolveNightMinutes(input.clockIn, input.clockOut, input.crossesMidnight)
    : 0;

  return { workedMinutes, regularMinutes, overtimeMinutes, nightMinutes, holidayMinutes, hourlyRateSnapshot };
}
