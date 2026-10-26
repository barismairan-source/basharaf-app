/**
 * ریز کارکرد و محاسبه‌ی حقوق ماهانه‌ی پرسنل — طبق روشی که در اکسل‌های حقوق صفاسیتی استفاده شده
 * («قالب حقوق ماهانه»، «محاسبه حقوق مهر ۱۴۰۵»، «ریز کارکرد») و با رسیدهای واریز بانکی مهر ۱۴۰۵
 * (حقوق پایه و اضافه‌کاری) تا تومان یکی است. توابع خالص‌اند (بدون DB) تا آزموده شوند.
 *
 * روش ساعتی (آشپزخانه):
 *   نرخ ساعتی = حقوق ماهانه‌ی توافقی ÷ ۲۰۸ (۲۶ روز × ۸ ساعت)
 *   حقوق پایه = همان مبلغ توافقی (در مهر برای همه کامل واریز شد، حتی کمتر از ۲۰۸ ساعت)
 *   اضافه‌کاری = (ساعت کار − ۲۰۸) × نرخ ساعتی × ۱٫۴، گرد‌شده به نزدیک‌ترین ۱۰۰۰ تومان
 * روش روزانه (سالن):
 *   مبلغ هر روز = حقوق ماهانه‌ی توافقی ÷ ۲۴
 *   روز محاسبه‌شده = روز حضور + یک روز به ازای هر ۶ شیفت (بخش صحیح)
 *   مبلغ = روز محاسبه‌شده × مبلغ هر روز، گرد‌شده به نزدیک‌ترین ۱۰۰۰ تومان
 *   یک نفر طبق تصمیم مدیر «حقوق کامل» می‌گیرد.
 */

export const STANDARD_MONTH_HOURS = 208;
export const OVERTIME_MULTIPLIER = 1.4;
export const HALL_BASE_DAYS = 24;
export const HALL_BONUS_EVERY_SHIFTS = 6;
export const ROUND_TO = 1000;

export type StatementModel = 'hourly' | 'daily';

export interface StatementBasis {
  model: StatementModel;
  agreedSalary: number;
  standardHours?: number;
  hourlyRate?: number;
  overtimeMultiplier?: number;
  baseDays?: number;
  dailyRate?: number;
  bonusEveryShifts?: number;
  rounding: number;
  fullSalary?: boolean;
}

export interface StatementDay { date: number | null; weekday: string; code: string; hours: number }
export interface StatementWeek { label: string; hours?: number; days?: StatementDay[] }
export interface StatementLine { label: string; amount: number; kind: 'earning' | 'deduction' | 'info'; detail?: string }

export function roundTo(x: number, step = ROUND_TO): number {
  return Math.round(x / step) * step;
}

export interface HourlyStatement {
  basis: StatementBasis;
  totalHours: number;
  overtimeHours: number;
  overtimePay: number;
  basePay: number;
  total: number;
  lines: StatementLine[];
  notes: string[];
}

export function computeHourlyStatement(input: {
  agreedSalary: number; weeklyHours: number[]; standardHours?: number; multiplier?: number; rounding?: number;
}): HourlyStatement {
  const standard = input.standardHours ?? STANDARD_MONTH_HOURS;
  const mult = input.multiplier ?? OVERTIME_MULTIPLIER;
  const rounding = input.rounding ?? ROUND_TO;
  const totalHours = input.weeklyHours.reduce((a, b) => a + b, 0);
  const hourlyRate = input.agreedSalary / standard;
  const overtimeHours = Math.max(totalHours - standard, 0);
  const overtimePay = roundTo(overtimeHours * hourlyRate * mult, rounding);
  const basePay = input.agreedSalary;
  const notes: string[] = [];
  if (totalHours < standard) notes.push(`ساعت کار (${totalHours}) کمتر از ${standard} ساعت بود؛ حقوق ثابت کامل پرداخت شد.`);
  const lines: StatementLine[] = [
    { label: 'حقوق ثابت ماه', amount: basePay, kind: 'earning', detail: `${standard} ساعت مبنا` },
  ];
  if (overtimeHours > 0) {
    lines.push({
      label: 'اضافه‌کاری', amount: overtimePay, kind: 'earning',
      detail: `${overtimeHours} ساعت × نرخ ساعتی × ${mult.toLocaleString('en-US')}`,
    });
  }
  return {
    basis: { model: 'hourly', agreedSalary: input.agreedSalary, standardHours: standard, hourlyRate: Math.round(hourlyRate), overtimeMultiplier: mult, rounding },
    totalHours, overtimeHours, overtimePay, basePay, total: basePay + overtimePay, lines, notes,
  };
}

export interface DailyStatement {
  basis: StatementBasis;
  presentDays: number;
  bonusDays: number;
  paidDays: number;
  total: number;
  lines: StatementLine[];
  notes: string[];
}

export function computeDailyStatement(input: {
  agreedSalary: number; presentDays: number | null; baseDays?: number; bonusEvery?: number; rounding?: number; fullSalary?: boolean;
}): DailyStatement {
  const baseDays = input.baseDays ?? HALL_BASE_DAYS;
  const bonusEvery = input.bonusEvery ?? HALL_BONUS_EVERY_SHIFTS;
  const rounding = input.rounding ?? ROUND_TO;
  const dailyRate = input.agreedSalary / baseDays;
  if (input.fullSalary || input.presentDays === null) {
    return {
      basis: { model: 'daily', agreedSalary: input.agreedSalary, baseDays, dailyRate: Math.round(dailyRate), bonusEveryShifts: bonusEvery, rounding, fullSalary: true },
      presentDays: input.presentDays ?? 0, bonusDays: 0, paidDays: baseDays, total: input.agreedSalary,
      lines: [{ label: 'حقوق کامل ماه', amount: input.agreedSalary, kind: 'earning' }],
      notes: ['طبق تصمیم مدیر، حقوق کامل پرداخت می‌شود.'],
    };
  }
  const bonusDays = Math.floor(input.presentDays / bonusEvery);
  const paidDays = input.presentDays + bonusDays;
  const total = roundTo(dailyRate * paidDays, rounding);
  const lines: StatementLine[] = [
    { label: `${input.presentDays} روز حضور`, amount: roundTo(dailyRate * input.presentDays, rounding), kind: 'earning', detail: `هر روز = حقوق ÷ ${baseDays}` },
  ];
  if (bonusDays > 0) lines.push({ label: `${bonusDays} روز تشویقی`, amount: total - lines[0]!.amount, kind: 'earning', detail: `هر ${bonusEvery} شیفت یک روز` });
  return {
    basis: { model: 'daily', agreedSalary: input.agreedSalary, baseDays, dailyRate: Math.round(dailyRate), bonusEveryShifts: bonusEvery, rounding },
    presentDays: input.presentDays, bonusDays, paidDays, total, lines, notes: [],
  };
}

/** توضیح فارسی «بر چه اساسی حساب می‌شود» برای نمایش به خود فرد. */
export function describeBasis(b: StatementBasis): string[] {
  const t = (n: number) => n.toLocaleString('en-US');
  if (b.model === 'hourly') {
    const std = b.standardHours ?? STANDARD_MONTH_HOURS;
    return [
      `حقوق ماهانه‌ی توافقی شما ${t(b.agreedSalary)} تومان است و مبنای آن ${std} ساعت در ماه است (۲۶ روز × ۸ ساعت).`,
      `نرخ هر ساعت = حقوق توافقی ÷ ${std} = ${t(b.hourlyRate ?? Math.round(b.agreedSalary / std))} تومان.`,
      `حقوق ثابت ماه کامل پرداخت می‌شود.`,
      `ساعت‌های بیشتر از ${std} در ماه اضافه‌کاری است: هر ساعت ${(b.overtimeMultiplier ?? OVERTIME_MULTIPLIER).toLocaleString('en-US')} برابر نرخ ساعتی.`,
      `مبلغ اضافه‌کاری به نزدیک‌ترین ${t(b.rounding)} تومان گرد می‌شود.`,
    ];
  }
  const base = b.baseDays ?? HALL_BASE_DAYS;
  if (b.fullSalary) return [`حقوق ماهانه‌ی شما ${t(b.agreedSalary)} تومان و کامل پرداخت می‌شود.`];
  return [
    `حقوق ماهانه‌ی توافقی شما ${t(b.agreedSalary)} تومان است و مبنای آن ${base} روز است.`,
    `مبلغ هر روز = حقوق توافقی ÷ ${base} = ${t(b.dailyRate ?? Math.round(b.agreedSalary / base))} تومان.`,
    `به ازای هر ${b.bonusEveryShifts ?? HALL_BONUS_EVERY_SHIFTS} شیفت حضور، یک روز اضافه حساب می‌شود.`,
    `مبلغ نهایی به نزدیک‌ترین ${t(b.rounding)} تومان گرد می‌شود.`,
  ];
}

export const SHIFT_HOURS: Record<string, number> = { 'صبح': 8, 'شب': 8, 'کوتاه': 5, 'آف': 0 };

/** «صبح+شب» → ۱۶ ساعت؛ «کوتاه» → ۵؛ «آف» → ۰. ناشناخته → null. */
export function shiftCodeHours(code: string): number | null {
  const parts = code.split('+').map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  let sum = 0;
  for (const p of parts) {
    const h = SHIFT_HOURS[p];
    if (h === undefined) return null;
    sum += h;
  }
  return sum;
}
