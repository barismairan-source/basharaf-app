import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

/**
 * اجرای migration‌های Drizzle روی دیتابیس.
 *
 * استفاده در CI/Production:
 *   npm run db:migrate
 *
 * فایل‌های migration در ./drizzle/migrations/ ذخیره می‌شوند.
 * هرگز مستقیماً SQL دستی روی production اجرا نکنید — از این مسیر استفاده کنید.
 */

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Add it to .env.local');
}

async function main() {
  const sql = postgres(connectionString!, { max: 1 });
  const db = drizzle(sql);

  console.log('▶ Running Drizzle migrations from ./drizzle/migrations …');
  await migrate(db, { migrationsFolder: './drizzle/migrations' });

  await sql.end();
  console.log('✓ Migrations completed.');
}

main().catch((err) => {
  console.error('✗ Migration failed:', err);
  process.exit(1);
});
