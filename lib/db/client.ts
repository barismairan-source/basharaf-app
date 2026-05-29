import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * Postgres client — Vercel + Supabase compatible.
 *
 * مهم: این client فقط در RUNTIME اجرا می‌شود (نه در build time).
 * اگر DATABASE_URL موجود نباشد، یک lazy error می‌دهد — نه در import بلکه
 * هنگام اولین query. این یعنی build روی Vercel/Liara بدون DATABASE_URL
 * کار می‌کند.
 *
 * Supabase connection string:
 *   postgres://postgres.xxxx:PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
 *
 * Liara connection string:
 *   postgres://root:PASSWORD@postgres.liara.cloud:PORT/postgres
 */

declare global {
  // eslint-disable-next-line no-var
  var __basharaf_postgres: ReturnType<typeof postgres> | undefined;
  // eslint-disable-next-line no-var
  var __basharaf_db: ReturnType<typeof drizzle> | undefined;
}

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    // در build time این اجرا نمی‌شود — فقط در runtime
    throw new Error(
      'DATABASE_URL is not set. Please add it to your environment variables.'
    );
  }

  const sslMode = process.env.DATABASE_SSL;
  const ssl =
    sslMode === 'false'
      ? false
      : sslMode === 'require' || process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }  // برای Supabase و Liara
        : false;

  return postgres(url, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl,
  });
}

// Singleton — جلوگیری از multiple connection در dev HMR
function getDb() {
  if (process.env.NODE_ENV === 'production') {
    // در production هر بار یک connection جدید (serverless)
    const client = createClient();
    return drizzle(client, { schema });
  }

  // در dev از cache استفاده می‌کنیم
  if (!globalThis.__basharaf_db) {
    globalThis.__basharaf_postgres = createClient();
    globalThis.__basharaf_db = drizzle(globalThis.__basharaf_postgres, { schema });
  }
  return globalThis.__basharaf_db;
}

// lazy getter — فقط وقتی واقعاً query می‌زنیم اجرا می‌شود
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    const instance = getDb();
    const value = (instance as any)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

export { schema };

export async function closeDb(): Promise<void> {
  if (globalThis.__basharaf_postgres) {
    await globalThis.__basharaf_postgres.end();
    globalThis.__basharaf_postgres = undefined;
    globalThis.__basharaf_db = undefined;
  }
}
