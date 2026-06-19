import { NextResponse } from 'next/server';
import { desc, and, eq, like } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get('page') ?? 1));
    const limit = Math.min(100, Math.max(1, Number(sp.get('limit') ?? 50)));
    const offset = (page - 1) * limit;
    const action = sp.get('action');
    const userId = sp.get('userId');

    const conditions = [];
    if (action) conditions.push(like(schema.auditLog.action, `%${action}%`));
    if (userId) conditions.push(eq(schema.auditLog.userId, userId));

    const rows = await db
      .select()
      .from(schema.auditLog)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(schema.auditLog.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      entries: rows.map(r => ({
        id: r.id,
        action: r.action,
        userId: r.userId,
        ip: r.ip,
        meta: r.meta ? JSON.parse(r.meta) : null,
        createdAt: r.createdAt,
      })),
      page,
      limit,
    });
  } catch (e) {
    return handleError(e);
  }
}
