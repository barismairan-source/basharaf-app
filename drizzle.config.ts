import 'dotenv/config';
import type { Config } from 'drizzle-kit';

/**
 * Drizzle Kit config — برای تولید migrations و push کردن schema.
 *
 * استفاده:
 *   npm run db:generate   تولید SQL migration بر اساس تغییرات schema
 *   npm run db:push       اعمال مستقیم schema روی DB (برای dev)
 *   npm run db:migrate    اجرای migration scripts (برای production)
 *   npm run db:studio     باز کردن Drizzle Studio (UI ادیتور database)
 *
 * `dotenv/config` در ابتدا تا env vars از .env.local خوانده شوند.
 */

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set in .env.local');
}

export default {
  schema: './lib/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // strict mode → از تغییرات destructive قبل از تایید جلوگیری می‌کند
  strict: true,
  verbose: true,
} satisfies Config;
