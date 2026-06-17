import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase Realtime client.
 *
 * این client فقط برای Realtime subscriptions استفاده می‌شود — نه برای
 * query (که با Drizzle + postgres-js انجام می‌شود).
 *
 * چرا دو client داریم؟
 * - postgres-js: مستقیم به Postgres وصل می‌شود — سریع‌ترین برای CRUD
 * - @supabase/supabase-js: از WebSocket برای Realtime استفاده می‌کند
 *
 * اگر env vars نباشند (مثلاً در build time)، null برمی‌گردد.
 * کامپوننت‌ها باید null check داشته باشند.
 *
 * env vars مورد نیاز:
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
 */

declare global {
  // eslint-disable-next-line no-var
  var __basharaf_supabase: SupabaseClient | undefined;
}

export function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  if (typeof window === 'undefined') return null; // فقط client-side

  if (!globalThis.__basharaf_supabase) {
    globalThis.__basharaf_supabase = createClient(url, key, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
      auth: {
        // ما از JWT خودمان استفاده می‌کنیم، نه Supabase Auth
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return globalThis.__basharaf_supabase;
}
