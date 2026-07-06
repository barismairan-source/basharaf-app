import { NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

/** GET /api/sms/log — ۵۰ ردیف آخر لاگ پیامک (SuperAdmin) */
export async function GET() {
  try {
    await requireAdmin();

    const rows = await db
      .select()
      .from(schema.smsLog)
      .orderBy(desc(schema.smsLog.createdAt))
      .limit(50);

    return NextResponse.json({
      logs: rows.map((r) => ({
        id: r.id,
        phone: r.phone,
        message: r.message.slice(0, 80),
        templateKey: r.templateKey,
        entityId: r.entityId,
        status: r.status,
        provider: r.provider,
        error: r.error,
        sentAt: r.sentAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    return handleError(e);
  }
}
