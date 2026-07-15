import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load E2E-specific env only. Never load .env.local — that file carries production credentials.
dotenv.config({ path: path.resolve(process.cwd(), '.env.e2e') });

export default async function globalTeardown() {
  if (process.env.E2E_ALLOW_DB_MUTATION !== '1') {
    console.warn('[teardown] E2E_ALLOW_DB_MUTATION not set — skipping cleanup');
    return;
  }
  const url = process.env.E2E_DATABASE_URL;
  if (!url) {
    console.warn('[teardown] E2E_DATABASE_URL not set — skipping cleanup');
    return;
  }

  const sql = postgres(url, {
    ssl: process.env.DATABASE_SSL === 'require' ? 'require' : false,
  });

  try {
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
