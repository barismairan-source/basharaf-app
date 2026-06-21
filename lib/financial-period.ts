import { db, schema } from '@/lib/db/client';

const FARSI_TO_ASCII: Record<string, string> = {
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
};

function toAsciiDigits(s: string): string {
  return s.replace(/[۰-۹]/g, (c) => FARSI_TO_ASCII[c] ?? c);
}

/**
 * تبدیل تاریخ جلالی (با ارقام فارسی یا ASCII) به {year, month}.
 * ورودی نمونه: '۱۴۰۵/۰۲/۳۱' یا '1405/02/31'
 */
export function parseJalaliYearMonth(dateStr: string): { year: number; month: number } {
  const parts = toAsciiDigits(dateStr).split('/');
  if (parts.length < 2) {
    throw new Error(`Invalid Jalali date string: "${dateStr}"`);
  }
  const year = parseInt(parts[0] ?? '', 10);
  const month = parseInt(parts[1] ?? '', 10);
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    throw new Error(`Invalid Jalali date string: "${dateStr}"`);
  }
  return { year, month };
}

export interface ClosedPeriod {
  jalaliYear: number;
  jalaliMonth: number;
}

/**
 * بررسی اینکه آیا تاریخ جلالی داده‌شده در یکی از دوره‌های بسته قرار دارد.
 */
export function isDateInClosedPeriod(
  dateStr: string,
  closedPeriods: ClosedPeriod[]
): boolean {
  if (closedPeriods.length === 0) return false;
  const { year, month } = parseJalaliYearMonth(dateStr);
  return closedPeriods.some((p) => p.jalaliYear === year && p.jalaliMonth === month);
}

/**
 * بارگذاری همه‌ی دوره‌های بسته از دیتابیس.
 * در هر درخواست یک‌بار فراخوانی می‌شود — جدول کوچک است (معمولاً < 100 ردیف).
 */
export async function loadClosedPeriods(): Promise<ClosedPeriod[]> {
  const rows = await db
    .select({
      jalaliYear: schema.financialPeriods.jalaliYear,
      jalaliMonth: schema.financialPeriods.jalaliMonth,
    })
    .from(schema.financialPeriods);
  return rows;
}

export const PERIOD_CLOSED_MESSAGE =
  'این تراکنش در یک دوره‌ی مالی بسته‌شده قرار دارد و غیرقابل تغییر است. ' +
  'برای اصلاح، ابتدا دوره‌ی مالی را بازگشایی کنید. ' +
  '(This transaction belongs to a closed financial period and cannot be modified.)';
