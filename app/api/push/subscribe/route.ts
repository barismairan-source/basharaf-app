/**
 * POST /api/push/subscribe — stores or refreshes a browser push subscription
 * for the current user. Any authenticated user may subscribe (push audience
 * targeting is not limited to SuperAdmin — matches SMS/email addresses).
 *
 * endpoint is globally unique per browser installation — upserting on it
 * lets the same browser re-subscribe (e.g. after the OS clears storage)
 * without creating duplicate rows, and re-points an endpoint to a new user
 * if the browser is shared and a different account subscribes from it.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = bodySchema.parse(await req.json());
    const userAgent = req.headers.get('user-agent')?.slice(0, 255) ?? null;

    await db
      .insert(schema.pushSubscriptions)
      .values({
        userId:    session.sub,
        endpoint:  body.endpoint,
        p256dh:    body.keys.p256dh,
        auth:      body.keys.auth,
        userAgent,
      })
      .onConflictDoUpdate({
        target: schema.pushSubscriptions.endpoint,
        set: {
          userId:     session.sub,
          p256dh:     body.keys.p256dh,
          auth:       body.keys.auth,
          userAgent,
          lastSeenAt: new Date(),
        },
      });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
