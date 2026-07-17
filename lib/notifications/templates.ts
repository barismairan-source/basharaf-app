/**
 * Email template builder for notification center V2.
 *
 * Privacy contract:
 * - Only name, Persian area label, and a panel link are included
 * - No phone numbers, resume data, form answers, or applicant PII beyond name
 * - actionUrl must be a safe relative path or match NEXT_PUBLIC_APP_URL origin exactly
 * - All dynamic values are HTML-escaped before insertion
 * - Plain-text variant always provided alongside HTML
 */

/** Escapes characters that have special meaning in HTML. */
export function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Validates that a URL is safe to use in notification links.
 *
 * Accepts:
 *   - Relative paths that start with exactly one "/" (e.g. "/admin/foo")
 *     — NOT "//" (protocol-relative) or "///" or any scheme-like prefix
 *   - Absolute URLs where protocol is exactly "http:" or "https:" AND
 *     the origin exactly matches NEXT_PUBLIC_APP_URL.
 *
 * Rejects:
 *   - "//evil.example" (protocol-relative — browser picks the scheme)
 *   - "///path"
 *   - "javascript:alert(1)"
 *   - "data:text/html,test"
 *   - Any external origin
 *   - Prefix-spoofing like "https://myapp.com.evil.example"
 */
export function isSafeActionUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  // A safe relative path starts with "/" but NOT "//" or more slashes
  if (url.startsWith('/') && !url.startsWith('//')) return true;
  try {
    const parsed = new URL(url);
    // Only http and https — reject javascript:, data:, ftp:, etc.
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) return false;
    // Origin must be an exact match — prevents prefix spoofing
    return parsed.origin === new URL(appUrl).origin;
  } catch {
    return false;
  }
}

/**
 * Returns an absolute URL for use in email/SMS links.
 * Relative paths are resolved against NEXT_PUBLIC_APP_URL.
 */
export function absoluteUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export interface NotificationEmailData {
  title: string;
  sub: string;
  actionUrl: string | null;
}

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

/** Builds plain-text + simple escaped HTML email body. */
export function buildNotificationEmail(data: NotificationEmailData): EmailContent {
  const subject = escapeHtml(data.title);
  const safeUrl = data.actionUrl && isSafeActionUrl(data.actionUrl)
    ? absoluteUrl(data.actionUrl)
    : null;

  const text = [
    data.title,
    data.sub,
    safeUrl ? `\nمشاهده در پنل: ${safeUrl}` : '',
    '\n---',
    'سامانه با شرف — این ایمیل خودکار است، پاسخ ندهید.',
  ].filter(Boolean).join('\n');

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family:Tahoma,Arial,sans-serif;direction:rtl;background:#f5f5f5;margin:0;padding:20px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:8px;padding:28px;border:1px solid #e5e7eb">
    <h2 style="margin:0 0 12px;font-size:16px;color:#1c1917">${escapeHtml(data.title)}</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#57534e;line-height:1.6">${escapeHtml(data.sub)}</p>
    ${safeUrl ? `<a href="${escapeHtml(safeUrl)}" style="display:inline-block;padding:10px 20px;background:#3730a3;color:#fff;border-radius:6px;text-decoration:none;font-size:13px">مشاهده در پنل</a>` : ''}
    <hr style="margin:24px 0;border:none;border-top:1px solid #f0ede8">
    <p style="margin:0;font-size:11px;color:#a8a29e">سامانه با شرف — این ایمیل خودکار است، پاسخ ندهید.</p>
  </div>
</body>
</html>`;

  return { subject, text, html };
}
