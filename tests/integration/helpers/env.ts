import { config } from 'dotenv';
import path from 'node:path';

/**
 * بارگذاری env vars برای integration testها — همان قرارداد drizzle.config.ts:
 * اول `.env.local` (در صورت وجود)، سپس `.env` به‌عنوان fallback.
 *
 * تست‌ها فقط وقتی DATABASE_URL ست شده باشد اجرا می‌شوند؛ در غیر این صورت
 * کل suite با `skip` رد می‌شود — پس به‌صورت پیش‌فرض هرگز روی هیچ دیتابیسی
 * (نه production و نه چیز دیگر) اجرا نمی‌شوند.
 */
config({ path: path.resolve(process.cwd(), '.env.local') });
config();

export function hasDatabaseUrl(): boolean {
  return !!process.env.DATABASE_URL;
}
