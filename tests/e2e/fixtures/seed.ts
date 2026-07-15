import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load E2E-specific env only. Never load .env.local — that file carries production credentials.
dotenv.config({ path: path.resolve(process.cwd(), '.env.e2e') });

export const TEST_USER_EMAIL = 'test@basharaf.app';
export const TEST_USER_PASSWORD = 'Test1234!';

export async function seedTestUser(): Promise<void> {
  // Fail before connecting if explicit opt-in is absent.
  if (process.env.E2E_ALLOW_DB_MUTATION !== '1') {
    throw new Error(
      '[seed] E2E_ALLOW_DB_MUTATION=1 is required. ' +
      'Set it in .env.e2e to confirm this is a development or test database.',
    );
  }
  const url = process.env.E2E_DATABASE_URL;
  if (!url) {
    throw new Error(
      '[seed] E2E_DATABASE_URL is not set. ' +
      'Add it to .env.e2e (never to .env.local).',
    );
  }

  const sql = postgres(url, {
    ssl: process.env.DATABASE_SSL === 'require' ? 'require' : false,
  });

  try {
    const existing = await sql`
      SELECT id FROM users WHERE email = ${TEST_USER_EMAIL} LIMIT 1
    `;
    if (existing.length === 0) {
      const passwordHash = await bcrypt.hash(TEST_USER_PASSWORD, 10);
      const today = new Date().toISOString().slice(0, 10);
      await sql`
        INSERT INTO users (id, name, email, password_hash, role, initials, last_seen, joined, is_active)
        VALUES (
          gen_random_uuid(),
          'Test Admin',
          ${TEST_USER_EMAIL},
          ${passwordHash},
          'SuperAdmin',
          'TA',
          'هم اکنون',
          ${today},
          true
        )
      `;
      console.log('[seed] Test user created:', TEST_USER_EMAIL);
    } else {
      console.log('[seed] Test user already exists:', TEST_USER_EMAIL);
    }
  } finally {
    await sql.end();
  }
}
