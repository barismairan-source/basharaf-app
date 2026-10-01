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

export const PERIOD_CLOSED_POST_MESSAGE =
  'ماه این تاریخ در دوره‌ی مالی بسته‌شده است و ثبت/تأیید سند در آن ممکن نیست. ' +
  'تاریخ را اصلاح کنید یا ابتدا دوره را بازگشایی کنید.';

/**
 * قفل واقعی دوره‌ی بسته روی همه‌ی مسیرهای ثبت (نه فقط ویرایش/حذف):
 * اگر ماه تاریخ داده‌شده بسته باشد، ApiError 422 می‌اندازد.
 * تاریخ نامعتبر (قدیمی/غیراستاندارد) را رد نمی‌کند — اعتبارسنجی تاریخ کار مرز API است.
 *
 * `dbOrTx` اختیاری تا داخل همان db.transaction هم قابل استفاده باشد.
 */
export async function assertPeriodOpen(
  dateStr: string | null | undefined,
  dbOrTx: Pick<typeof db, 'select'> = db,
  message: string = PERIOD_CLOSED_POST_MESSAGE,
): Promise<void> {
  if (!dateStr) return;
  const rows = await dbOrTx
    .select({
      jalaliYear: schema.financialPeriods.jalaliYear,
      jalaliMonth: schema.financialPeriods.jalaliMonth,
    })
    .from(schema.financialPeriods);
  let closed = false;
  try {
    closed = isDateInClosedPeriod(dateStr, rows);
  } catch {
    closed = false;
  }
  if (closed) {
    const { ApiError } = await import('@/lib/api-error');
    throw new ApiError(422, message, 'FINANCIAL_PERIOD_CLOSED');
  }
}
