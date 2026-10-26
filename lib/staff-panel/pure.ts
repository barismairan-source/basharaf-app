/**
 * کمک‌های خالص پنل پرسنل (بدون DB/شبکه) — جدا برای آزمون واحد.
 */

/** فقط چند رقم آخر؛ بقیه ستاره. کمتر از ۸ نویسه → همه ستاره (چیزی لو نمی‌رود). */
export function maskTail(value: string | null | undefined, visible = 4): string | null {
  if (!value) return null;
  const v = value.replace(/\s+/g, '');
  if (v.length < visible * 2) return '*'.repeat(v.length);
  return '*'.repeat(v.length - visible) + v.slice(-visible);
}

/** وضعیت‌های دوره‌ی حقوقی که فیشش به پرسنل نشان داده می‌شود (بعد از تأیید مدیر). */
export const VISIBLE_PAYROLL_STATUSES = ['approved', 'posted'] as const;

export function isPayslipVisibleToStaff(runStatus: string): boolean {
  return (VISIBLE_PAYROLL_STATUSES as readonly string[]).includes(runStatus);
}

/** دوره‌ی شمسی «YYYY-MM» معتبر؟ */
export function isValidPeriod(p: string | null): p is string {
  if (!p) return false;
  const m = /^(\d{4})-(\d{2})$/.exec(p);
  if (!m) return false;
  const y = Number(m[1]), mo = Number(m[2]);
  return y >= 1300 && y <= 1600 && mo >= 1 && mo <= 12;
}

export interface StaffAttendanceRow {
  status: 'draft' | 'confirmed' | 'locked';
  attendanceType: string;
  workedMinutes: number;
}

/** جمع دقیقه‌ی حضورِ «کاری»؛ تأییدشده جدا از در انتظار تأیید. مرخصی/غیبت جزو حضور حساب نمی‌شود. */
export function summarizeAttendance(rows: StaffAttendanceRow[]): { confirmedMinutes: number; pendingMinutes: number; days: number } {
  const worked = rows.filter((r) => r.attendanceType === 'present' || r.attendanceType === 'holiday_work' || r.attendanceType === 'off_day_work');
  return {
    confirmedMinutes: worked.filter((r) => r.status !== 'draft').reduce((a, r) => a + r.workedMinutes, 0),
    pendingMinutes: worked.filter((r) => r.status === 'draft').reduce((a, r) => a + r.workedMinutes, 0),
    days: worked.length,
  };
}

/** دوره‌ی شمسی قبلی/بعدی (برای دکمه‌های ماه قبل و بعد). */
export function shiftPeriod(period: string, delta: number): string {
  const [y, m] = period.split('-').map(Number) as [number, number];
  const idx = y * 12 + (m - 1) + delta;
  const ny = Math.floor(idx / 12), nm = (idx % 12) + 1;
  return `${ny}-${String(nm).padStart(2, '0')}`;
}

/** ارقام فارسی/عربی → لاتین (برای دوره‌ی «YYYY-MM» و مقایسه). */
export function toLatinDigits(s: string): string {
  return s.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0)).replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

export const JALALI_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

export function periodLabel(period: string): string {
  const [y, m] = period.split('-').map(Number) as [number, number];
  return `${JALALI_MONTHS[m - 1] ?? ''} ${y}`;
}

export function formatMinutes(m: number): string {
  const h = Math.floor(m / 60), mm = m % 60;
  return mm ? `${h} ساعت و ${mm} دقیقه` : `${h} ساعت`;
}
