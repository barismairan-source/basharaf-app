/**
 * «این ماه تا امروز» — حقوقِ ماهِ جاری بر اساس حضورِ ثبت‌شده تا همین لحظه، با همان روش اکسل‌های حقوق
 * (statements.ts): آشپزخانه حقوق ثابت ماه + اضافه‌کاری بالای ۲۰۸ ساعت (جدا واریز می‌شوند)، سالن روزانه.
 * دو عدد جدا: فقط حضورِ تأییدشده‌ی مدیر، و با حضورهای منتظر تأیید (تا نفر بلافاصله بعد از ثبت حضور ببیند).
 * توابع خالص‌اند (بدون DB).
 */
import {
  HALL_BASE_DAYS, HALL_BONUS_EVERY_SHIFTS, OVERTIME_MULTIPLIER, STANDARD_MONTH_HOURS,
  computeDailyStatement, computeHourlyStatement, describeBasis,
  type StatementBasis, type StatementLine, type StatementModel,
} from './statements';

export interface MonthRow { workDate: string; workedMinutes: number; status: string; attendanceType: string }

export interface MonthPart {
  minutes: number;
  days: number;
  total: number;
  lines: StatementLine[];
  /** ساعتی: ساعت تا شروع اضافه‌کاری (۰ یعنی وارد اضافه‌کاری شده). */
  hoursToOvertime?: number;
  /** روزانه: روز محاسبه‌شده (حضور + تشویقی). */
  paidDays?: number;
}

export interface MonthToDate {
  model: StatementModel;
  basis: StatementBasis;
  basisText: string[];
  /** ساختار حقوق: عنوان‌ها و مبلغ‌های ثابت (حقوق ثابت، نرخ ساعت، نرخ اضافه‌کاری، …) */
  structure: PayStructureRow[];
  /** عنوانی که مدیر برای حقوق این نفر گذاشته (اختیاری) */
  payTitle: string | null;
  confirmed: MonthPart;
  withPending: MonthPart;
}

export interface PayStructureRow { label: string; value: string }

const WORKED = new Set(['present', 'holiday_work', 'off_day_work']);

/** جمع دقیقه و روزهای کاریِ متمایز (چند حضور در یک روز = یک روز). */
export function tally(rows: MonthRow[]): { minutes: number; days: number } {
  const worked = rows.filter((r) => WORKED.has(r.attendanceType));
  return { minutes: worked.reduce((a, r) => a + r.workedMinutes, 0), days: new Set(worked.map((r) => r.workDate)).size };
}

function part(basis: StatementBasis, minutes: number, days: number): MonthPart {
  if (basis.model === 'hourly') {
    const hours = Math.round((minutes / 60) * 100) / 100;
    const s = computeHourlyStatement({ agreedSalary: basis.agreedSalary, weeklyHours: [hours], standardHours: basis.standardHours, multiplier: basis.overtimeMultiplier, rounding: basis.rounding });
    const standard = basis.standardHours ?? STANDARD_MONTH_HOURS;
    return { minutes, days, total: s.total, lines: s.lines, hoursToOvertime: Math.max(0, Math.round((standard - hours) * 100) / 100) };
  }
  const s = computeDailyStatement({ agreedSalary: basis.agreedSalary, presentDays: days, baseDays: basis.baseDays, bonusEvery: basis.bonusEveryShifts, rounding: basis.rounding, fullSalary: basis.fullSalary });
  return { minutes, days, total: s.total, lines: s.lines, paidDays: s.paidDays };
}

/** عنوان‌ها و عددهای ثابت حقوق یک نفر، برای نمایش به خودش. مبلغ‌ها به تومان. */
export function describePayStructure(b: StatementBasis): PayStructureRow[] {
  const t = (n: number) => `${Math.round(n).toLocaleString('en-US')} تومان`;
  if (b.model === 'hourly') {
    const standard = b.standardHours ?? STANDARD_MONTH_HOURS;
    const mult = b.overtimeMultiplier ?? OVERTIME_MULTIPLIER;
    const rate = b.agreedSalary / standard;
    return [
      { label: 'حقوق ثابت ماهانه', value: t(b.agreedSalary) },
      { label: 'ساعت مبنای ماه', value: `${standard} ساعت` },
      { label: 'نرخ هر ساعت', value: t(rate) },
      { label: `اضافه‌کاری (هر ساعت بالای ${standard})`, value: `${t(rate * mult)} (${mult.toLocaleString('en-US')} برابر)` },
    ];
  }
  const base = b.baseDays ?? HALL_BASE_DAYS;
  if (b.fullSalary) return [{ label: 'حقوق ثابت ماهانه', value: t(b.agreedSalary) }, { label: 'روش', value: 'حقوق کامل ماه' }];
  return [
    { label: 'حقوق توافقی ماهانه', value: t(b.agreedSalary) },
    { label: 'مبلغ هر روز', value: `${t(b.agreedSalary / base)} (حقوق ÷ ${base})` },
    { label: 'روز تشویقی', value: `هر ${b.bonusEveryShifts ?? HALL_BONUS_EVERY_SHIFTS} شیفت، یک روز` },
  ];
}

/** نرخ ساعتی که برای تبدیل ورود/خروج به حضور لازم است: ساعتی حقوق÷ساعت مبنا، روزانه حقوق÷(روز مبنا×۸). */
export function hourlyRateForBasis(b: StatementBasis): number {
  const hours = b.model === 'hourly' ? (b.standardHours ?? STANDARD_MONTH_HOURS) : (b.baseDays ?? HALL_BASE_DAYS) * 8;
  return Math.round(b.agreedSalary / hours);
}

export function settingsToBasis(s: {
  model: string; agreedSalary: number; standardHours: number; overtimeMultiplier: number | string;
  baseDays: number; bonusEveryShifts: number; fullSalary: boolean;
}): StatementBasis {
  if (s.model === 'daily') {
    return { model: 'daily', agreedSalary: s.agreedSalary, baseDays: s.baseDays, dailyRate: Math.round(s.agreedSalary / s.baseDays), bonusEveryShifts: s.bonusEveryShifts, rounding: 1000, ...(s.fullSalary ? { fullSalary: true } : {}) };
  }
  return { model: 'hourly', agreedSalary: s.agreedSalary, standardHours: s.standardHours, hourlyRate: Math.round(s.agreedSalary / s.standardHours), overtimeMultiplier: Number(s.overtimeMultiplier), rounding: 1000 };
}

export function computeMonthToDate(basis: StatementBasis, rows: MonthRow[], payTitle: string | null = null): MonthToDate {
  const confirmed = tally(rows.filter((r) => r.status !== 'draft'));
  const all = tally(rows);
  return {
    model: basis.model, basis, basisText: describeBasis(basis), structure: describePayStructure(basis), payTitle,
    confirmed: part(basis, confirmed.minutes, confirmed.days),
    withPending: part(basis, all.minutes, all.days),
  };
}

/**
 * مبنای حقوق یک نفر: تنظیم مدیر، وگرنه آخرین ریز کارکرد واردشده (همان روش و حقوق توافقی اکسل)، وگرنه از پرونده‌ی خودش
 * (آشپزخانه → ساعتی با حقوق ماهانه یا نرخ × ۲۰۸؛ سالن → روزانه). بدون حقوق → null.
 */
export function resolveBasis(input: {
  settingsBasis?: StatementBasis | null;
  latestStatementBasis?: StatementBasis | null;
  section: string | null;
  baseMonthlySalary?: number | null;
  hourlyRate?: number | null;
}): StatementBasis | null {
  if (input.settingsBasis) return input.settingsBasis;
  const b = input.latestStatementBasis;
  if (b && b.agreedSalary > 0) return b;
  const salary = input.baseMonthlySalary && input.baseMonthlySalary > 0 ? input.baseMonthlySalary
    : input.hourlyRate && input.hourlyRate > 0 ? Math.round(input.hourlyRate * STANDARD_MONTH_HOURS) : null;
  if (!salary) return null;
  if (input.section === 'سالن') {
    return { model: 'daily', agreedSalary: salary, baseDays: HALL_BASE_DAYS, dailyRate: Math.round(salary / HALL_BASE_DAYS), bonusEveryShifts: HALL_BONUS_EVERY_SHIFTS, rounding: 1000 };
  }
  return { model: 'hourly', agreedSalary: salary, standardHours: STANDARD_MONTH_HOURS, hourlyRate: Math.round(salary / STANDARD_MONTH_HOURS), overtimeMultiplier: OVERTIME_MULTIPLIER, rounding: 1000 };
}
