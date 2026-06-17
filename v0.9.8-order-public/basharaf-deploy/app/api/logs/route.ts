import { NextResponse } from 'next/server';
import { desc, eq, and, gte, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

/**
 * GET /api/logs — خواندن لاگ‌های سیستم (فقط SuperAdmin).
 * query params: level, category, limit
 */
export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const level = searchParams.get('level');
    const category = searchParams.get('category');
    const limit = Math.min(Number(searchParams.get('limit')) || 200, 500);

    const conditions = [];
    if (level && level !== 'all') conditions.push(eq(schema.systemLogs.level, level));
    if (category && category !== 'all') conditions.push(eq(schema.systemLogs.category, category));

    const rows = await db
      .select()
      .from(schema.systemLogs)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(schema.systemLogs.createdAt))
      .limit(limit);

    // شمارش بر اساس level (۲۴ ساعت اخیر)
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const counts = await db
      .select({ level: schema.systemLogs.level, n: sql<number>`count(*)::int` })
      .from(schema.systemLogs)
      .where(gte(schema.systemLogs.createdAt, since))
      .groupBy(schema.systemLogs.level);

    return NextResponse.json({
      logs: rows.map((r) => ({
        id: r.id,
        level: r.level,
        category: r.category,
        message: r.message,
        path: r.path,
        method: r.method,
        statusCode: r.statusCode,
        userEmail: r.userEmail,
        context: r.context,
        stack: r.stack,
        ip: r.ip,
        createdAt: r.createdAt.toISOString(),
      })),
      counts: counts.reduce((a, c) => ({ ...a, [c.level]: c.n }), {} as Record<string, number>),
    });
  } catch (e) {
    return handleError(e);
  }
}

/**
 * DELETE /api/logs — پاک کردن همه لاگ‌ها (فقط SuperAdmin).
 */
export async function DELETE() {
  try {
    await requireAdmin();
    await db.delete(schema.systemLogs);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
