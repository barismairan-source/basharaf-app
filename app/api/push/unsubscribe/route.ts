/**
 * POST /api/push/unsubscribe — removes the current user's push subscription
 * for one browser (identified by endpoint). Scoped to session.sub — a user
 * can only remove their own subscriptions.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  endpoint: z.string().url(),
});

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = bodySchema.parse(await req.json());

    await db
      .delete(schema.pushSubscriptions)
      .where(
        and(
          eq(schema.pushSubscriptions.endpoint, body.endpoint),
          eq(schema.pushSubscriptions.userId, session.sub)
        )
      );

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
