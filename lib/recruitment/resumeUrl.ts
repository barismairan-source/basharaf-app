/**
 * قواعد امن برای رزومه‌ی فرم عمومی `/apply` (ممیزی ۲۰۲۶-۱۰-۳۰، BA-07).
 *
 * فرم فقط فایل را با FileReader به data URI تبدیل می‌کند؛ پس API فقط data URI با
 * نوع‌های مجاز می‌پذیرد. قبلاً هر رشته‌ای پذیرفته می‌شد و route رزومه‌ی ادمین به آن
 * redirect می‌کرد و دانلود ZIP آن را سمت سرور fetch می‌کرد (SSRF).
 */

/** نوع‌هایی که `accept` فرم اجازه می‌دهد (+ octet-stream وقتی مرورگر نوع را نمی‌شناسد). */
export const RESUME_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/octet-stream',
] as const;

const DATA_URI_RE = /^data:([a-z0-9.+/-]*);base64,[A-Za-z0-9+/]*={0,2}$/i;

/** آیا این مقدار data URI رزومه با نوع مجاز است؟ (نوع خالی = octet-stream) */
export function isAllowedResumeDataUri(value: string): boolean {
  const m = DATA_URI_RE.exec(value);
  if (!m) return false;
  const mime = (m[1] || 'application/octet-stream').toLowerCase();
  return (RESUME_MIME_TYPES as readonly string[]).includes(mime);
}

/** Content-Type امن برای سرو: فقط نوع‌های مجاز، بقیه octet-stream. */
export function safeResumeMimeType(mime: string | undefined): string {
  const m = (mime || '').toLowerCase();
  return (RESUME_MIME_TYPES as readonly string[]).includes(m) ? m : 'application/octet-stream';
}

/**
 * رزومه‌های قدیمی ممکن است URL ذخیره‌شده داشته باشند. فقط https روی میزبان
 * Supabase خودِ پروژه دنبال/واکشی می‌شود؛ هر میزبان دیگری رد می‌شود.
 */
export function isTrustedResumeUrl(value: string, env: NodeJS.ProcessEnv = process.env): boolean {
  let url: URL;
  try { url = new URL(value); } catch { return false; }
  if (url.protocol !== 'https:') return false;
  const hosts = [env.SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_URL]
    .map((u) => { try { return u ? new URL(u).hostname : null; } catch { return null; } })
    .filter((h): h is string => !!h);
  return hosts.includes(url.hostname);
}
