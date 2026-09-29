/**
 * «الان» به‌وقت تهران — مستقل از timezone سرور (که ممکن است UTC باشد).
 * فقط برای منطق رزرو استفاده می‌شود؛ getTodayJalali()/جاهای دیگر پروژه دست‌نخورده می‌مانند.
 */

const TEHRAN_TZ = 'Asia/Tehran';
const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export interface TehranNow {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** 0=یکشنبه..6=شنبه، مطابق Date.getDay() جاوااسکریپت. */
  weekday: number;
}

export function tehranNow(at: Date = new Date()): TehranNow {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TEHRAN_TZ,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', weekday: 'short',
  });
  const parts = fmt.formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    weekday: WEEKDAY_INDEX[get('weekday')] ?? 0,
  };
}

/** وزن قابل‌مقایسه‌ی یک تاریخ گریگوری y/m/d — برای «آینده/گذشته/امروز است؟» بدون درگیری ساعت. */
export function ymdWeight(year: number, month: number, day: number): number {
  return year * 10000 + month * 100 + day;
}
