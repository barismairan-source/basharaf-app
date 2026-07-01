import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

export default async function globalTeardown() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn('[teardown] DATABASE_URL not set — skipping cleanup');
    return;
  }

  const sql = postgres(url, {
    ssl: process.env.DATABASE_SSL === 'require' ? 'require' : false,
  });

  try {
    // پاک کردن همه رکوردهای با [TEST] در title — فقط داده‌های test
    const deleted = await sql`
      DELETE FROM transactions WHERE title LIKE '%[TEST]%' RETURNING id
    `;
    if (deleted.length > 0) {
      console.log(`[teardown] Cleaned up ${deleted.length} [TEST] transaction(s)`);
    }
  } finally {
    await sql.end();
  }
}
