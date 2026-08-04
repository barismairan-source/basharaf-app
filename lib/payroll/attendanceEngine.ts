/**
 * موتور محاسبه‌ی حضور و حقوق ساعتی — پیوره، بدون DB.
 *
 * سه مفهوم جدا نگه داشته می‌شوند: شیفت برنامه‌ریزی‌شده (planned)، حضور واقعی
 * (attendance/worked)، و حقوق قابل‌پرداخت (pay). انتخاب یک قالب شیفت فقط
 * «برنامه» را می‌سازد؛ حضور همیشه جدا ثبت/تأیید می‌شود.
 *
 * پول: bigint تومان (اینجا number، چون فقط جمع/ضرب صحیح روی مقادیر کوچک).
 * زمان: همه محاسبات روی دقیقه‌ی صحیح انجام می‌شود (نه اعشار ساعت).
 * گردکردن: فقط در calcAttendancePay و calculateHourlyPayslip (یک نقطه).
 */

import { calcProgressiveTax, type PayrollParameters, type PayslipLine } from './payrollEngine';

const r = Math.round;

export type BreakPolicy = 'paid' | 'unpaid' | 'none';
export type OvertimePolicy = 'auto' | 'manager_approval' | 'no_multiplier';
export type EntryMode = 'time_range' | 'total_minutes';
export type AttendanceType =
  | 'present' | 'absent' | 'paid_leave' | 'unpaid_leave' | 'sick_leave'
  | 'holiday_work' | 'off_day_work';
export type AttendanceStatus = 'draft' | 'confirmed' | 'locked';

/* ───── زمان (HH:MM ↔ دقیقه) ──────────────────────────────────── */

/** "HH:MM" → دقیقه از نیمه‌شب (۰..۱۴۳۹). */
export function timeToMinutes(hhmm: string): number {
  const m = /^([0-1]?\d|2[0-3]):([0-5]\d)$/.exec(hhmm.trim());
  if (!m) throw new RangeError(`فرمت ساعت نامعتبر: ${hhmm}`);
  return parseInt(m[1]!, 10) * 60 + parseInt(m[2]!, 10);
}

/** دقیقه از نیمه‌شب → "HH:MM". */
export function minutesToTime(totalMinutes: number): string {
  const m = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/**
 * فاصله‌ی دو ساعت به دقیقه. اگر crossesMidnight=false و end<=start باشد،
 * نامعتبر است (باید crossesMidnight درست تنظیم شود).
 * مثال: ورود ۲۰:۰۰، خروج ۰۴:۰۰، crossesMidnight=true → ۴۸۰ دقیقه.
 */
export function minutesBetween(start: string, end: string, crossesMidnight: boolean): number {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  if (crossesMidnight) {
    const diff = 1440 - s + e;
    if (diff <= 0 || diff > 1440) throw new RangeError('بازه‌ی زمانی نامعتبر (عبور از نیمه‌شب)');
    return diff;
  }
  const diff = e - s;
  if (diff <= 0) throw new RangeError('ساعت پایان باید بعد از ساعت شروع باشد (یا crossesMidnight را فعال کنید)');
  return diff;
}

/** مدت شیفت باید >۰ و ≤۱۴۴۰ دقیقه (یک شبانه‌روز) باشد. */
export function validateShiftMinutes(minutes: number): boolean {
  return Number.isFinite(minutes) && minutes > 0 && minutes <= 1440;
}

/**
 * مجموع حضور خام (قبل از استراحت) بر اساس روش ثبت.
 * time_range: از روی ورود/خروج. total_minutes: مقدار دستی.
 */
export function resolveTotalPresenceMinutes(input: {
  entryMode: EntryMode;
  clockIn?: string | null;
  clockOut?: string | null;
  crossesMidnight?: boolean;
  manualWorkedMinutes?: number | null;
}): number {
  if (input.entryMode === 'total_minutes') {
    const m = input.manualWorkedMinutes ?? 0;
    if (m < 0 || m > 1440) throw new RangeError('مجموع دقیقه باید بین ۰ و ۱۴۴۰ باشد');
    return m;
  }
  if (!input.clockIn || !input.clockOut) throw new RangeError('ورود و خروج الزامی است');
  return minutesBetween(input.clockIn, input.clockOut, !!input.crossesMidnight);
}

/* ───── ماشین حالت حضور (draft → confirmed → locked) ───────────── */

export function canEditAttendance(status: AttendanceStatus): boolean {
  return status !== 'locked';
}
export function canConfirmAttendance(status: AttendanceStatus): boolean {
  return status === 'draft';
}
export function canLockAttendance(status: AttendanceStatus): boolean {
  return status === 'confirmed';
}
/** فقط حضور تأییدشده (یا قفل‌شده) وارد محاسبه‌ی حقوق می‌شود. */
export function isPayableAttendanceStatus(status: AttendanceStatus): boolean {
  return status === 'confirmed' || status === 'locked';
}

/* ───── استراحت ────────────────────────────────────────────────── */

/**
 * اعمال سیاست استراحت روی حضور خام.
 * unpaid → حضور قابل‌پرداخت = خام - استراحت. paid|none → بدون کسر.
 */
export function applyBreakPolicy(
  totalPresenceMinutes: number,
  breakMinutes: number,
  policy: BreakPolicy,
): number {
  if (totalPresenceMinutes < 0) throw new RangeError('حضور نمی‌تواند منفی باشد');
  if (breakMinutes < 0) throw new RangeError('استراحت نمی‌تواند منفی باشد');
  if (breakMinutes > totalPresenceMinutes) throw new RangeError('استراحت نمی‌تواند بیشتر از حضور خام باشد');
  if (policy === 'unpaid') return totalPresenceMinutes - breakMinutes;
  return totalPresenceMinutes;
}

/* ───── تفکیک عادی/اضافه‌کاری ──────────────────────────────────── */

export interface RegularOvertimeSplit {
  regularMinutes: number;
  overtimeMinutes: number;   // حضور بیش از برنامه (هرگز حذف نمی‌شود)
  shortfallMinutes: number;  // کسری نسبت به برنامه — فقط گزارشی
}

/** مبنای اضافه‌کاری = مدت شیفت برنامه‌ریزی‌شده‌ی همان روز. */
export function splitRegularOvertime(workedMinutes: number, plannedMinutes: number): RegularOvertimeSplit {
  if (workedMinutes < 0) throw new RangeError('حضور نمی‌تواند منفی باشد');
  const regularMinutes = Math.min(workedMinutes, plannedMinutes);
  const overtimeMinutes = Math.max(0, workedMinutes - plannedMinutes);
  const shortfallMinutes = Math.max(0, plannedMinutes - workedMinutes);
  return { regularMinutes, overtimeMinutes, shortfallMinutes };
}

/**
 * روز تعطیل‌کاری/کار در روز مرخصی: کل حضور قابل‌پرداخت به‌عنوان تعطیل‌کاری
 * حساب می‌شود (نه تفکیک عادی/اضافه‌کاری).
 */
export function deriveHolidayMinutes(attendanceType: AttendanceType, workedMinutes: number): number {
  return attendanceType === 'holiday_work' || attendanceType === 'off_day_work' ? workedMinutes : 0;
}

/* ───── شب‌کاری ────────────────────────────────────────────────── */

/**
 * دقایق هم‌پوشان با بازه‌ی شب (پیش‌فرض ۲۲:۰۰ تا ۰۶:۰۰) در بازه‌ی حضور.
 * فقط برای entryMode='time_range' قابل‌محاسبه است (نیاز به ساعت دقیق).
 */
export function resolveNightMinutes(
  clockIn: string,
  clockOut: string,
  crossesMidnight: boolean,
  nightStart = '22:00',
  nightEnd = '06:00',
): number {
  const dayLen = 1440;
  const s = timeToMinutes(clockIn);
  const e = s + minutesBetween(clockIn, clockOut, crossesMidnight);
  const nStart = timeToMinutes(nightStart);
  const nEnd = timeToMinutes(nightEnd);

  // بازه‌ی شب را به یک یا دو بازه‌ی خطی (بدون عبور از نیمه‌شب) تبدیل کن،
  // سپس برای هر تکرار روزانه (چون حضور می‌تواند بیش از ۲۴ ساعت خط زمانی را لمس کند) با بازه‌ی حضور هم‌پوشانی بگیر.
  const nightIntervals: Array<[number, number]> = [];
  if (nStart < nEnd) {
    nightIntervals.push([nStart, nEnd]);
  } else {
    nightIntervals.push([nStart, dayLen]);
    nightIntervals.push([0, nEnd]);
  }

  let total = 0;
  // حضور حداکثر ۱۴۴۰ دقیقه است؛ برای پوشش دو شبانه‌روز (offset روز قبل/بعد) سه تکرار کافی است.
  for (const offset of [-dayLen, 0, dayLen]) {
    for (const [ns, ne] of nightIntervals) {
      const overlapStart = Math.max(s, ns + offset);
      const overlapEnd = Math.min(e, ne + offset);
      if (overlapEnd > overlapStart) total += overlapEnd - overlapStart;
    }
  }
  return total;
}

/* ───── نرخ ساعتی (snapshot بر اساس تاریخ) ────────────────────── */

export interface HourlyRateRecord {
  hourlyRate: number;
  effectiveFrom: string; // ISO 'YYYY-MM-DD'
  effectiveTo: string | null;
}

/** نرخ فعال یک کارمند در یک تاریخ مشخص (یا null اگر نرخی تعریف نشده). */
export function resolveActiveHourlyRate(rates: HourlyRateRecord[], onDate: string): number | null {
  const match = rates.find(rt => rt.effectiveFrom <= onDate && (rt.effectiveTo === null || rt.effectiveTo >= onDate));
  return match ? match.hourlyRate : null;
}

/** هم‌پوشانی دو بازه‌ی زمانی روزانه (برای جلوگیری از هم‌پوشانی شیفت). */
export function shiftRangesOverlap(
  aStart: string, aEnd: string, aCrossesMidnight: boolean,
  bStart: string, bEnd: string, bCrossesMidnight: boolean,
): boolean {
  const as = timeToMinutes(aStart);
  const ae = as + minutesBetween(aStart, aEnd, aCrossesMidnight);
  const bs = timeToMinutes(bStart);
  const be = bs + minutesBetween(bStart, bEnd, bCrossesMidnight);
  // هر دو بازه روی یک خط‌زمان بی‌نهایت‌تکرارشونده (روزهای پی‌درپی) مقایسه می‌شوند
  // چون یک شیفت عبور از نیمه‌شب می‌تواند با شیفت روز بعد هم‌پوشان شود.
  for (const offset of [-1440, 0, 1440]) {
    if (as < be + offset && bs + offset < ae) return true;
  }
  return false;
}

/* ───── محاسبه‌ی مبلغ یک روز حضور ──────────────────────────────── */

export interface DayPayInput {
  regularMinutes: number;
  overtimeMinutes: number;   // فقط اگر تأییدشده باشد اینجا غیرصفر بدهید
  nightMinutes: number;
  holidayMinutes: number;
  hourlyRate: number;
  overtimeMultiplier: number;
  nightMultiplier: number;
  holidayMultiplier: number;
}

export interface DayPayResult {
  regularPay: number;
  overtimePay: number;
  nightPay: number;
  holidayPay: number;
  totalPay: number;
}

/**
 * فرمول‌های دقیق حقوق ساعتی:
 *   regularPay = round(regularMinutes * hourlyRate / 60)
 *   overtimePay = round(overtimeMinutes * hourlyRate * overtimeMultiplier / 60)
 *   nightPay = round(nightMinutes * hourlyRate * nightMultiplier / 60)
 *   holidayPay = round(holidayMinutes * hourlyRate * holidayMultiplier / 60)
 */
export function calcAttendancePay(input: DayPayInput): DayPayResult {
  const regularPay = r(input.regularMinutes * input.hourlyRate / 60);
  const overtimePay = r(input.overtimeMinutes * input.hourlyRate * input.overtimeMultiplier / 60);
  const nightPay = r(input.nightMinutes * input.hourlyRate * input.nightMultiplier / 60);
  const holidayPay = r(input.holidayMinutes * input.hourlyRate * input.holidayMultiplier / 60);
  return { regularPay, overtimePay, nightPay, holidayPay, totalPay: regularPay + overtimePay + nightPay + holidayPay };
}

/* ───── فیش حقوقی کامل ساعتی (تجمیع یک دوره) ───────────────────── */

export interface AttendanceDayForPayslip {
  workDate: string;
  plannedMinutes: number;
  workedMinutes: number;
  regularMinutes: number;
  overtimeMinutes: number;      // اضافه‌کاری خام (پیشنهادی)
  overtimeApproved: boolean;    // فقط اگر true باشد وارد مبلغ می‌شود
  nightMinutes: number;
  holidayMinutes: number;
  hourlyRateSnapshot: number;
  attendanceType: AttendanceType;
}

export interface HourlyPayrollEventInput {
  type: 'advance' | 'deduction' | 'bonus';
  amount: number;
}

export interface HourlyCalcInput {
  days: AttendanceDayForPayslip[];
  params: Pick<PayrollParameters, 'overtimeMultiplier' | 'nightShiftPremium' | 'holidayMultiplier' | 'insuranceEmployeeRate' | 'insuranceEmployerRate' | 'taxBrackets'>;
  events: HourlyPayrollEventInput[];
}

export interface HourlyPayslipResult {
  plannedMinutesTotal: number;
  workedMinutesTotal: number;
  regularMinutesTotal: number;
  overtimeMinutesTotal: number;        // فقط تأییدشده
  overtimePendingMinutesTotal: number; // پیشنهادی، تأییدنشده (گزارشی)
  nightMinutesTotal: number;
  holidayMinutesTotal: number;
  paidLeaveMinutesTotal: number;
  unpaidLeaveMinutesTotal: number;
  absentMinutesTotal: number;
  ratesUsed: number[];
  grossEarnings: number;
  insuranceBase: number;
  taxableBase: number;
  insuranceEmployee: number;
  insuranceEmployer: number;
  incomeTax: number;
  totalDeductions: number;
  netPay: number;
  isNegative: boolean;
  lines: PayslipLine[];
}

/**
 * فیش حقوقی کامل از روی حضورهای تأییدشده‌ی یک دوره.
 * هر روز با نرخ همان روز (hourlyRateSnapshot) جداگانه محاسبه و جمع می‌شود —
 * تغییر نرخ میان‌ماه هرگز روی روزهای قبل از تاریخ اثر اعمال نمی‌شود.
 */
export function calculateHourlyPayslip(input: HourlyCalcInput): HourlyPayslipResult {
  const { days, params, events } = input;
  const lines: PayslipLine[] = [];

  let plannedMinutesTotal = 0, workedMinutesTotal = 0, regularMinutesTotal = 0;
  let overtimeMinutesTotal = 0, overtimePendingMinutesTotal = 0;
  let nightMinutesTotal = 0, holidayMinutesTotal = 0;
  let paidLeaveMinutesTotal = 0, unpaidLeaveMinutesTotal = 0, absentMinutesTotal = 0;
  let regularPaySum = 0, overtimePaySum = 0, nightPaySum = 0, holidayPaySum = 0, paidLeavePaySum = 0;
  const ratesUsed = new Set<number>();

  for (const day of days) {
    if (day.attendanceType === 'paid_leave') {
      paidLeaveMinutesTotal += day.workedMinutes;
      paidLeavePaySum += r(day.workedMinutes * day.hourlyRateSnapshot / 60);
      ratesUsed.add(day.hourlyRateSnapshot);
      continue;
    }
    if (day.attendanceType === 'unpaid_leave' || day.attendanceType === 'sick_leave') {
      unpaidLeaveMinutesTotal += day.workedMinutes;
      continue;
    }
    if (day.attendanceType === 'absent') {
      absentMinutesTotal += day.plannedMinutes;
      continue;
    }

    plannedMinutesTotal += day.plannedMinutes;
    workedMinutesTotal += day.workedMinutes;
    regularMinutesTotal += day.regularMinutes;
    nightMinutesTotal += day.nightMinutes;
    holidayMinutesTotal += day.holidayMinutes;
    overtimePendingMinutesTotal += day.overtimeApproved ? 0 : day.overtimeMinutes;
    const approvedOvertime = day.overtimeApproved ? day.overtimeMinutes : 0;
    overtimeMinutesTotal += approvedOvertime;
    ratesUsed.add(day.hourlyRateSnapshot);

    const pay = calcAttendancePay({
      regularMinutes: day.regularMinutes,
      overtimeMinutes: approvedOvertime,
      nightMinutes: day.nightMinutes,
      holidayMinutes: day.holidayMinutes,
      hourlyRate: day.hourlyRateSnapshot,
      overtimeMultiplier: params.overtimeMultiplier,
      nightMultiplier: params.nightShiftPremium,
      holidayMultiplier: params.holidayMultiplier,
    });
    regularPaySum += pay.regularPay;
    overtimePaySum += pay.overtimePay;
    nightPaySum += pay.nightPay;
    holidayPaySum += pay.holidayPay;
  }

  if (regularPaySum > 0) lines.push({ category: 'earning', code: 'base', labelFa: 'حقوق ساعتی (عادی)', amount: regularPaySum });
  if (overtimePaySum > 0) lines.push({ category: 'earning', code: 'overtime', labelFa: 'اضافه‌کاری', amount: overtimePaySum, meta: { minutes: overtimeMinutesTotal } });
  if (nightPaySum > 0) lines.push({ category: 'earning', code: 'night', labelFa: 'شب‌کاری', amount: nightPaySum, meta: { minutes: nightMinutesTotal } });
  if (holidayPaySum > 0) lines.push({ category: 'earning', code: 'holiday', labelFa: 'تعطیل‌کاری', amount: holidayPaySum, meta: { minutes: holidayMinutesTotal } });
  if (paidLeavePaySum > 0) lines.push({ category: 'earning', code: 'paid_leave', labelFa: 'مرخصی با حقوق', amount: paidLeavePaySum, meta: { minutes: paidLeaveMinutesTotal } });

  const bonusTotal = events.filter(e => e.type === 'bonus').reduce((s, e) => s + e.amount, 0);
  if (bonusTotal > 0) lines.push({ category: 'earning', code: 'bonus', labelFa: 'پاداش/آکورد', amount: bonusTotal });

  const grossEarnings = regularPaySum + overtimePaySum + nightPaySum + holidayPaySum + paidLeavePaySum + bonusTotal;
  const insuranceBase = grossEarnings;
  const taxableBase = grossEarnings;

  const insuranceEmployee = r(insuranceBase * params.insuranceEmployeeRate);
  const insuranceEmployer = r(insuranceBase * params.insuranceEmployerRate);
  lines.push({ category: 'statutory', code: 'insurance_emp', labelFa: 'بیمه سهم کارگر', amount: insuranceEmployee });
  lines.push({ category: 'statutory', code: 'insurance_employer', labelFa: 'بیمه سهم کارفرما', amount: insuranceEmployer, meta: { employerCost: true } });

  const taxableAfterInsurance = taxableBase - insuranceEmployee;
  const incomeTax = calcProgressiveTax(taxableAfterInsurance, params.taxBrackets);
  if (incomeTax > 0) lines.push({ category: 'statutory', code: 'tax', labelFa: 'مالیات بر درآمد', amount: incomeTax });

  const advanceTotal = events.filter(e => e.type === 'advance').reduce((s, e) => s + e.amount, 0);
  if (advanceTotal > 0) lines.push({ category: 'deduction', code: 'advance', labelFa: 'مساعده/علی‌الحساب', amount: advanceTotal });

  const penaltyTotal = events.filter(e => e.type === 'deduction').reduce((s, e) => s + e.amount, 0);
  if (penaltyTotal > 0) lines.push({ category: 'deduction', code: 'penalty', labelFa: 'جریمه/کسر کار', amount: penaltyTotal });

  const totalDeductions = insuranceEmployee + incomeTax + advanceTotal + penaltyTotal;
  const netPay = grossEarnings - totalDeductions;

  return {
    plannedMinutesTotal, workedMinutesTotal, regularMinutesTotal,
    overtimeMinutesTotal, overtimePendingMinutesTotal,
    nightMinutesTotal, holidayMinutesTotal,
    paidLeaveMinutesTotal, unpaidLeaveMinutesTotal, absentMinutesTotal,
    ratesUsed: [...ratesUsed],
    grossEarnings, insuranceBase, taxableBase,
    insuranceEmployee, insuranceEmployer, incomeTax, totalDeductions, netPay,
    isNegative: netPay < 0,
    lines,
  };
}
