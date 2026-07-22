/** فقط برای نام فایل — کاراکترهای غیرمجاز فایل‌سیستم را حذف می‌کند. */
export function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '').trim().slice(0, 80) || 'resume';
}
