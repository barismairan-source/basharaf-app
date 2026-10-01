/**
 * Rate limiter ساده برای login endpoint (checkRateLimit/recordFailedAttempt
 * فقط مخصوص لاگین‌اند — مسیرهای عمومی از consumeRequestLimit استفاده می‌کنند).
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
 * گرفتن IP کلاینت از request.
 *
 * مقدار اول X-Forwarded-For را خودِ کلاینت می‌تواند بنویسد (جعل)، پس از آن
 * استفاده نمی‌کنیم: اول x-real-ip (که پروکسی جلویی بازنویسی می‌کند)، وگرنه
 * مقدار N-امِ از انتهای X-Forwarded-For — N = تعداد پروکسی‌های مورد اعتماد
 * (`TRUSTED_PROXY_HOPS`، پیش‌فرض ۱ = آخرین مقداری که پروکسی لیارا اضافه کرده).
 */
export function getClientIp(req: Request): string {
  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const hops = Math.max(1, parseInt(process.env.TRUSTED_PROXY_HOPS ?? '1', 10) || 1);
    const parts = forwarded.split(',').map((p) => p.trim()).filter(Boolean);
    const ip = parts[Math.max(0, parts.length - hops)];
    if (ip) return ip;
  }
  return 'unknown';
}

// ─── محدودکننده‌ی جدا برای هر مسیر عمومی ──────────────────────────────────
// قبلاً رزرو/پیگیری/لغو رزرو و فرم استخدام از همان Map لاگین استفاده می‌کردند
// و حتی درخواست موفق را «تلاش ناموفق» ثبت می‌کردند ← ۵ رزرو از وای‌فای رستوران
// ورود کارکنان را ۳۰ دقیقه قفل می‌کرد. حالا هر مسیر سطل خودش را دارد و
// «تعداد درخواست» در یک پنجره‌ی زمانی شمرده می‌شود (نه شکست).

interface BucketRecord { count: number; windowStart: number }
const buckets = new Map<string, BucketRecord>();

export interface RequestLimit {
  /** حداکثر درخواست در پنجره */
  max: number;
  /** طول پنجره (میلی‌ثانیه) */
  windowMs: number;
}

/** یک درخواست را می‌شمارد؛ اگر از سقف گذشته باشد allowed=false. */
export function consumeRequestLimit(
  bucket: string,
  key: string,
  limit: RequestLimit,
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const id = `${bucket}:${key}`;
  // اگر IP واقعی کلاینت به ما نرسد (unknown یا IP داخلی پروکسی)، همه‌ی کاربران یک
  // کلید مشترک دارند — سقف ۱۰ برابر می‌شود تا مشتریان واقعی همدیگر را قفل نکنند.
  const max = isSharedKey(key) ? limit.max * 10 : limit.max;
  const rec = buckets.get(id);
  if (!rec || now - rec.windowStart >= limit.windowMs) {
    buckets.set(id, { count: 1, windowStart: now });
    pruneBuckets(now);
    return { allowed: true };
  }
  if (rec.count >= max) {
    return { allowed: false, retryAfter: Math.ceil((rec.windowStart + limit.windowMs - now) / 1000) };
  }
  rec.count += 1;
  return { allowed: true };
}

function isSharedKey(key: string): boolean {
  return key === 'unknown'
    || /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc|fd)/i.test(key);
}

let lastPrune = 0;
function pruneBuckets(now: number): void {
  if (now - lastPrune < 10 * 60 * 1000) return;
  lastPrune = now;
  for (const [id, rec] of buckets) {
    if (now - rec.windowStart > 60 * 60 * 1000) buckets.delete(id);
  }
}

/** سقف‌های مسیرهای عمومی — سخاوتمند برای مشتری واقعی، تنگ برای اسپم. */
export const PUBLIC_LIMITS = {
  reservationCreate: { max: 20, windowMs: 60 * 60 * 1000 },
  reservationLookup: { max: 60, windowMs: 15 * 60 * 1000 },
  recruitmentSubmit: { max: 10, windowMs: 60 * 60 * 1000 },
  recruitmentUpload: { max: 30, windowMs: 60 * 60 * 1000 },
  orderCreate: { max: 40, windowMs: 60 * 60 * 1000 },
  otpSend: { max: 10, windowMs: 60 * 60 * 1000 },
} as const satisfies Record<string, RequestLimit>;

// ─── لاگین: علاوه بر IP، بر اساس ایمیل ─────────────────────────────────────
// حتی اگر مهاجم IP را عوض کند، حدس رمز روی یک حساب محدود می‌ماند.
const LOGIN_PER_EMAIL: RequestLimit = { max: 20, windowMs: 15 * 60 * 1000 };
const failedByEmail = new Map<string, BucketRecord>();

export function checkEmailLoginLimit(email: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const rec = failedByEmail.get(email);
  if (!rec || now - rec.windowStart >= LOGIN_PER_EMAIL.windowMs) return { allowed: true };
  if (rec.count >= LOGIN_PER_EMAIL.max) {
    return { allowed: false, retryAfter: Math.ceil((rec.windowStart + LOGIN_PER_EMAIL.windowMs - now) / 1000) };
  }
  return { allowed: true };
}

export function recordEmailLoginFailure(email: string): void {
  const now = Date.now();
  const rec = failedByEmail.get(email);
  if (!rec || now - rec.windowStart >= LOGIN_PER_EMAIL.windowMs) {
    failedByEmail.set(email, { count: 1, windowStart: now });
  } else {
    rec.count += 1;
  }
}

export function clearEmailLoginFailures(email: string): void {
  failedByEmail.delete(email);
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
