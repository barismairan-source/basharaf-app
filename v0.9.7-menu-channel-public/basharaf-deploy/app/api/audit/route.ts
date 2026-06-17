import { NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';

/**
 * GET /api/audit
 * فقط SuperAdmin — آخرین ۱۰۰ رویداد
 */
export async function GET() {
  try {
    await requireAdmin();
    const rows = await db
      .select()
      .from(schema.auditLog)
      .orderBy(desc(schema.auditLog.createdAt))
      .limit(100);
    return NextResponse.json({ logs: rows });
  } catch (e) {
    return handleError(e);
  }
}
