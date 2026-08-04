import { db, schema } from '@/lib/db/client';
import { eq } from 'drizzle-orm';
import { ApiError } from '@/lib/api-error';
import {
  resolveTotalPresenceMinutes, applyBreakPolicy, splitRegularOvertime,
  deriveHolidayMinutes, resolveNightMinutes, resolveActiveHourlyRate,
  type AttendanceType, type BreakPolicy, type EntryMode,
} from './attendanceEngine';

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
