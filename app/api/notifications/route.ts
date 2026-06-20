import { NextResponse } from 'next/server';
import { eq, or, isNull, desc } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';

/**
 * /api/notifications
 *
 * GET → اعلان‌های مربوط به کاربر فعلی (userId مطابق، یا userId=null برای همه)
 */

export async function GET() {
  try {
    const session = await requireSession();

    // اعلان‌ها برای این کاربر یا برای همه (userId=null)
    const rows = await db
      .select()
      .from(schema.notifications)
      .where(
        or(
          eq(schema.notifications.userId, session.sub),
          isNull(schema.notifications.userId)
        )
      )
      .orderBy(desc(schema.notifications.createdAt));

    return NextResponse.json({
      notifications: rows.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        sub: n.sub,
        time: n.time,
        read: n.read,
        txId: n.txId,
        actionUrl: n.actionUrl ?? null,
        entityId: n.entityId ?? null,
      })),
    });
  } catch (e) {
    return handleError(e);
  }
}

/**
 * PATCH /api/notifications
 * Body: { id?: string, markAllRead?: boolean }
 *
 * اگر markAllRead=true → همه اعلان‌های این کاربر را read می‌کند
 * اگر id داده شود → فقط آن اعلان را read می‌کند
 */
export async function PATCH(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json().catch(() => ({}));

    if (body.markAllRead) {
      await db
        .update(schema.notifications)
        .set({ read: true })
        .where(eq(schema.notifications.userId, session.sub));
      return NextResponse.json({ ok: true });
    }

    if (typeof body.id === 'string') {
      await db
        .update(schema.notifications)
        .set({ read: true })
        .where(eq(schema.notifications.id, body.id));
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
