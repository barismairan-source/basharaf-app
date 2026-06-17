import { db, schema } from '@/lib/db/client';

/**
 * سیستم لاگ مرکزی.
 *
 * logEvent خطاها و رویدادهای مهم را در جدول system_logs ذخیره می‌کند.
 * طراحی‌شده که هرگز throw نکند — اگر خود لاگ‌کردن fail شود، فقط در
 * console می‌نویسد تا یک خطای لاگ، درخواست اصلی را نشکند.
 */

export type LogLevel = 'error' | 'warn' | 'info';

export interface LogInput {
  level: LogLevel;
  category?: string;
  message: string;
  path?: string | null;
  method?: string | null;
  statusCode?: number | null;
  userId?: string | null;
  userEmail?: string | null;
  context?: unknown;
  stack?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

export async function logEvent(input: LogInput): Promise<void> {
  try {
    await db.insert(schema.systemLogs).values({
      level: input.level,
      category: input.category ?? 'general',
      message: input.message.slice(0, 2000),
      path: input.path ?? null,
      method: input.method ?? null,
      statusCode: input.statusCode ?? null,
      userId: input.userId ?? null,
      userEmail: input.userEmail ?? null,
      context: input.context ? safeStringify(input.context) : null,
      stack: input.stack ? input.stack.slice(0, 4000) : null,
      ip: input.ip ?? null,
      userAgent: input.userAgent ? input.userAgent.slice(0, 300) : null,
    });
  } catch (e) {
    // اگر لاگ‌کردن fail شد، فقط console — درخواست اصلی نباید بشکند
    console.error('logEvent failed:', e instanceof Error ? e.message : e);
    console.error('Original log:', input.level, input.category, input.message);
  }
}

/** خطا را از یک Request استخراج و لاگ می‌کند */
export async function logError(
  error: unknown,
  req?: Request,
  extra?: { category?: string; statusCode?: number; userId?: string; userEmail?: string }
): Promise<void> {
  const err = error as { message?: string; code?: string; stack?: string };
  let path: string | null = null;
  let method: string | null = null;
  let ip: string | null = null;
  let userAgent: string | null = null;

  if (req) {
    try {
      path = new URL(req.url).pathname;
      method = req.method;
      ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null;
      userAgent = req.headers.get('user-agent');
    } catch {
      /* ignore */
    }
  }

  await logEvent({
    level: 'error',
    category: extra?.category ?? 'api',
    message: err.message ?? String(error),
    path,
    method,
    statusCode: extra?.statusCode ?? null,
    userId: extra?.userId ?? null,
    userEmail: extra?.userEmail ?? null,
    context: err.code ? { code: err.code } : undefined,
    stack: err.stack ?? null,
    ip,
    userAgent,
  });
}

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v).slice(0, 2000);
  } catch {
    return String(v).slice(0, 2000);
  }
}
