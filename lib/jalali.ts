import { toFa } from './utils';
import DateObject from 'react-date-object';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';

/**
 * Helpers تاریخ شمسی واقعی — فاز ۹.
 *
 * استفاده از کتابخانه react-date-object که با react-multi-date-picker
 * هم‌کار است. این یعنی DateObjectهایی که در picker می‌سازیم با این
 * helperها سازگارند.
 *
 * در فاز ۱۰ (backend) همین رشته‌ها به سرور فرستاده می‌شوند و سرور هم
 * با همان فرمت ذخیره می‌کند (یا به ISO تبدیل می‌کند، بسته به طراحی DB).
 */

/**
 * تاریخ امروز به شمسی، با ارقام فارسی.
 * `getTodayJalali()` → '۱۴۰۵/۰۲/۳۱' (مثلاً)
 */
export function getTodayJalali(): string {
  const today = new DateObject({
    calendar: persian,
    locale: persian_fa,
  });
  return today.format('YYYY/MM/DD');
}

/**
 * بررسی فرمت معتبر تاریخ شمسی به‌صورت رشته.
 * فقط شکل (شکستن با /) را بررسی می‌کند، نه معتبر بودن تاریخ.
 */
export function isValidJalaliString(input: string): boolean {
  return /^[\d۰-۹]{4}\/[\d۰-۹]{1,2}\/[\d۰-۹]{1,2}$/.test(input.trim());
}

/**
 * فرمت کردن سه عدد سال/ماه/روز به رشته فارسی استاندارد.
 * `formatJalali(1405, 2, 31)` → '۱۴۰۵/۰۲/۳۱'
 */
export function formatJalali(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return toFa(`${year}/${m}/${d}`);
}

/**
 * تبدیل تاریخ شمسی رشته‌ای به Date گریگوری.
 * برای sort/comparison استفاده می‌شود.
 *
 * `jalaliToDate('۱۴۰۵/۰۲/۳۱')` → Date(2026, 4, 21)
 *
 * در صورت شکست، null برمی‌گرداند.
 */
export function jalaliToDate(jalali: string): Date | null {
  if (!isValidJalaliString(jalali)) return null;
  try {
    const obj = new DateObject({
      calendar: persian,
      locale: persian_fa,
      date: jalali,
      format: 'YYYY/MM/DD',
    });
    return obj.toDate();
  } catch {
    return null;
  }
}

/**
 * تبدیل Date گریگوری به رشته‌ی شمسی (برای نمایش تاریخ‌های ذخیره‌شده‌ی میلادی).
 * `dateToJalali(new Date(2026,4,21))` → '۱۴۰۵/۰۲/۳۱'
 * در صورت نامعتبر بودن، امروز شمسی را برمی‌گرداند.
 */
export function dateToJalali(date: Date): string {
  try {
    const obj = new DateObject({ calendar: persian, locale: persian_fa, date });
    return obj.format('YYYY/MM/DD');
  } catch {
    return getTodayJalali();
  }
}
