/**
 * کمک‌های خالص سمت کلاینت (بدون DOM/شبکه) — جدا برای آزمون واحد.
 */

/**
 * توکن لینک شخصی از نشانی صفحه. لینک‌های جدید توکن را بعد از # دارند (#t=…) تا هرگز
 * به سرور، لاگ‌های پراکسی یا Referer نرسد؛ لینک‌های قدیمی‌تر ?t=… هم پذیرفته می‌شوند.
 */
export function readLinkToken(search: string, hash: string): string | null {
  const fromHash = new URLSearchParams(hash.replace(/^#/, '')).get('t');
  if (fromHash) return fromHash;
  return new URLSearchParams(search.replace(/^\?/, '')).get('t');
}

/**
 * یک خانه‌ی CSV. مقدارهایی که با = + - @ (یا Tab/CR) شروع شوند در اکسل فرمول اجرا
 * می‌کنند (CSV injection) — با ' بی‌خطر می‌شوند. اعداد واقعی دست نمی‌خورند.
 */
export function csvCell(v: string | number | null): string {
  if (v === null) return '';
  if (typeof v === 'number') return String(v);
  const s = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** آیا گزینه‌های Face ID که از قبل گرفته شده هنوز تازه‌اند؟ (سرور ۵ دقیقه نگه می‌دارد) */
export function optionsStillFresh(fetchedAt: number | null, now: number, maxAgeMs = 4 * 60 * 1000): boolean {
  return fetchedAt !== null && now - fetchedAt < maxAgeMs;
}
