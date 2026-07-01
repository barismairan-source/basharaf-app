import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

export const TEST_USER_EMAIL = 'test@basharaf.app';
export const TEST_USER_PASSWORD = 'Test1234!';

export async function seedTestUser(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('[seed] DATABASE_URL not set');

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
