/**
 * Rate limiter ساده برای login endpoint.
 *
 * چرا in-memory به‌جای Redis؟
 * - در Vercel serverless، هر function instance حافظه‌ی جداگانه دارد
 * - ولی برای یک سامانه ۵-۱۰ کاربر این کاملاً کافی است
 * - اگر بعداً Redis خواستید، فقط این فایل را تغییر دهید
 *
 * الگوریتم: Sliding Window
 * - هر IP: حداکثر MAX_ATTEMPTS تلاش در WINDOW_MS
 * - بعد از BLOCK_MS بلاک می‌شود
 * - موفق: counter reset می‌شود
 */

const MAX_ATTEMPTS = 5; // حداکثر تلاش ناموفق
const WINDOW_MS = 15 * 60 * 1000; // ۱۵ دقیقه
const BLOCK_MS = 30 * 60 * 1000; // ۳۰ دقیقه بلاک

interface AttemptRecord {
  count: number;
  firstAttempt: number;
  blockedUntil?: number;
}

// در serverless، این برای هر instance جداست — اشکال ندارد برای سامانه کوچک
const attempts = new Map<string, AttemptRecord>();

/**
 * بررسی اینکه آیا این IP مجاز به تلاش است.
 * Returns: { allowed: true } یا { allowed: false, retryAfter: seconds }
 */
export function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = attempts.get(ip);

  if (!record) {
    return { allowed: true };
  }

  // اگر بلاک شده
  if (record.blockedUntil && now < record.blockedUntil) {
    const retryAfter = Math.ceil((record.blockedUntil - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // اگر window قدیمی شده، reset کن
  if (now - record.firstAttempt > WINDOW_MS) {
    attempts.delete(ip);
    return { allowed: true };
  }

  // اگر از حد گذشته، بلاک کن
  if (record.count >= MAX_ATTEMPTS) {
    if (!record.blockedUntil) {
      record.blockedUntil = now + BLOCK_MS;
    }
    const retryAfter = Math.ceil((record.blockedUntil - now) / 1000);
    return { allowed: false, retryAfter };
  }

  return { allowed: true };
}

/**
 * ثبت یک تلاش ناموفق.
 */
export function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const record = attempts.get(ip);

  if (!record) {
    attempts.set(ip, { count: 1, firstAttempt: now });
  } else {
    record.count += 1;
    attempts.set(ip, record);
  }
}

/**
 * پاک کردن record (بعد از login موفق).
 */
export function clearAttempts(ip: string): void {
  attempts.delete(ip);
}

/**
 * گرفتن IP از request.
 * Vercel: از header X-Forwarded-For می‌خواند.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown';
  }
  return req.headers.get('x-real-ip') ?? 'unknown';
}

// ─── OTP verify rate limiter — keyed by phone number ─────────────────────────
// جدا از login rate limiter: هدف جلوگیری از brute-force کد ۶ رقمی
// بعد از OTP_MAX_ATTEMPTS شکست، OTP فعال invalidate می‌شود

export const OTP_MAX_ATTEMPTS = 5;
const OTP_WINDOW_MS = 15 * 60 * 1000; // ۱۵ دقیقه

interface OtpAttemptRecord {
  count: number;
  firstAttempt: number;
}

const otpAttempts = new Map<string, OtpAttemptRecord>();

export function checkOtpRateLimit(phone: string): { allowed: boolean } {
  const now = Date.now();
  const record = otpAttempts.get(phone);
  if (!record) return { allowed: true };
  if (now - record.firstAttempt > OTP_WINDOW_MS) {
    otpAttempts.delete(phone);
    return { allowed: true };
  }
  return { allowed: record.count < OTP_MAX_ATTEMPTS };
}

/** ثبت یک تلاش ناموفق — برمی‌گرداند تعداد کل تلاش‌های ناموفق فعلی */
export function recordOtpFailedAttempt(phone: string): number {
  const now = Date.now();
  const record = otpAttempts.get(phone);
  if (!record || now - record.firstAttempt > OTP_WINDOW_MS) {
    otpAttempts.set(phone, { count: 1, firstAttempt: now });
    return 1;
  }
  record.count += 1;
  otpAttempts.set(phone, record);
  return record.count;
}

export function clearOtpAttempts(phone: string): void {
  otpAttempts.delete(phone);
}
