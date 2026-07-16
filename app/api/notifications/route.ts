/**
 * /api/notifications — V2
 *
 * Security fixes:
 * - Returns ONLY rows WHERE userId = session.sub (no null-user rows)
 * - Every single-row mutation: atomic UPDATE...WHERE id=? AND user_id=? RETURNING
 * - Compound keyset pagination — (createdAt DESC, id DESC) cursor
 * - Invalid cursor returns 400; DB COUNT for unread (not in-memory)
 * - Unauthorized/invalid ids return 404 (does not reveal other users' rows)
 */

import { NextResponse } from 'next/server';
import { and, desc, eq, isNotNull, isNull, lt, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { handleError, ApiError } from '@/lib/api-error';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT     = 50;

const getQuerySchema = z.object({
  cursor: z.string().optional(),
  filter: z.enum(['all', 'unread', 'archived', 'info', 'warning', 'critical']).optional().default('all'),
  limit:  z.coerce.number().int().min(1).max(MAX_LIMIT).optional().default(DEFAULT_LIMIT),
});

const patchBodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('read'),     id: z.string().uuid() }),
  z.object({ action: z.literal('unread'),   id: z.string().uuid() }),
  z.object({ action: z.literal('archive'),  id: z.string().uuid() }),
  z.object({ action: z.literal('read-all') }),
]);

// ─── Cursor encoding ──────────────────────────────────────────────

function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ at: createdAt.toISOString(), id })).toString('base64');
}

function decodeCursor(cursor: string): { at: Date; id: string } {
  const raw = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8')) as Record<string, unknown>;
  if (typeof raw.at !== 'string' || typeof raw.id !== 'string') throw new Error('bad shape');
  const at = new Date(raw.at);
  if (isNaN(at.getTime())) throw new Error('bad date');
  if (!/^[0-9a-f-]{36}$/i.test(raw.id)) throw new Error('bad id');
  return { at, id: raw.id };
}

// ─── GET /api/notifications ──────────────────────────────────────

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const userId  = session.sub;

    const url = new URL(req.url);
    const parsed = getQuerySchema.safeParse({
      cursor: url.searchParams.get('cursor') ?? undefined,
      filter: url.searchParams.get('filter') ?? undefined,
      limit:  url.searchParams.get('limit')  ?? undefined,
    });
    if (!parsed.success) {
      throw new ApiError(400, 'پارامترهای نامعتبر', 'INVALID_PARAMS');
    }

    const { cursor, filter, limit } = parsed.data;

    // Base ownership guard
    const ownerClause = eq(schema.notifications.userId, userId);

    // Compound keyset cursor: (createdAt DESC, id DESC)
    let cursorWhere: ReturnType<typeof or> | undefined;
    if (cursor) {
      try {
        const { at: cursorAt, id: cursorId } = decodeCursor(cursor);
        cursorWhere = or(
          lt(schema.notifications.createdAt, cursorAt),
          and(
            eq(schema.notifications.createdAt, cursorAt),
            lt(schema.notifications.id, cursorId)
          )
        );
      } catch {
        throw new ApiError(400, 'کرسر نامعتبر است', 'INVALID_CURSOR');
      }
    }

    // Build filter-specific WHERE
    const extra = cursorWhere ? [cursorWhere] : [];

    let filterWhere: ReturnType<typeof and>;

    if (filter === 'unread') {
      filterWhere = and(ownerClause, eq(schema.notifications.read, false), isNull(schema.notifications.archivedAt), ...extra);
    } else if (filter === 'archived') {
      filterWhere = and(ownerClause, isNotNull(schema.notifications.archivedAt), ...extra);
    } else if (filter === 'info' || filter === 'warning' || filter === 'critical') {
      filterWhere = and(ownerClause, eq(schema.notifications.type, filter), isNull(schema.notifications.archivedAt), ...extra);
    } else {
      filterWhere = and(ownerClause, isNull(schema.notifications.archivedAt), ...extra);
    }

    const rows = await db
      .select()
      .from(schema.notifications)
      .where(filterWhere)
      .orderBy(desc(schema.notifications.createdAt), desc(schema.notifications.id))
      .limit(limit + 1);

    const hasMore    = rows.length > limit;
    const page       = rows.slice(0, limit);
    const lastItem   = page[page.length - 1];
    const nextCursor = hasMore && lastItem
      ? encodeCursor(lastItem.createdAt, lastItem.id)
      : null;

    // Authoritative unread count via DB COUNT — not in-memory filtering
    const [countRow] = await db
      .select({ c: sql<number>`COUNT(*)::int` })
      .from(schema.notifications)
      .where(and(
        ownerClause,
        eq(schema.notifications.read, false),
        isNull(schema.notifications.archivedAt)
      ));
    const unreadCount = countRow?.c ?? 0;

    return NextResponse.json({
      notifications: page.map((n) => ({
        id:         n.id,
        type:       n.type,
        title:      n.title,
        sub:        n.sub,
        read:       n.read,
        readAt:     n.readAt?.toISOString()     ?? null,
        archivedAt: n.archivedAt?.toISOString() ?? null,
        createdAt:  n.createdAt.toISOString(),
        txId:       n.txId      ?? null,
        actionUrl:  n.actionUrl ?? null,
        entityId:   n.entityId  ?? null,
        ruleKey:    n.ruleKey   ?? null,
        priority:   n.priority  ?? 0,
        time:       n.time,
      })),
      nextCursor,
      unreadCount,
    });
  } catch (e) {
    return handleError(e);
  }
}

// ─── PATCH /api/notifications ─────────────────────────────────────

export async function PATCH(req: Request) {
  try {
    const session = await requireSession();
    const userId  = session.sub;

    const rawBody = await req.json().catch(() => ({}));
    const parsed = patchBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      throw new ApiError(400, 'پارامترهای نامعتبر', 'INVALID_PARAMS');
    }

    const body = parsed.data;
    const now  = new Date();

    if (body.action === 'read-all') {
      await db
        .update(schema.notifications)
        .set({ read: true, readAt: now })
        .where(and(
          eq(schema.notifications.userId, userId),
          eq(schema.notifications.read, false)
        ));
      return NextResponse.json({ ok: true, unreadCount: 0 });
    }

    // Atomic ownership-guarded UPDATE — no separate SELECT needed
    const ownerGuard = and(
      eq(schema.notifications.id, body.id),
      eq(schema.notifications.userId, userId)
    );

    let updated: { id: string }[] = [];

    if (body.action === 'read') {
      updated = await db
        .update(schema.notifications)
        .set({ read: true, readAt: now })
        .where(ownerGuard)
        .returning({ id: schema.notifications.id });
    } else if (body.action === 'unread') {
      updated = await db
        .update(schema.notifications)
        .set({ read: false, readAt: null })
        .where(ownerGuard)
        .returning({ id: schema.notifications.id });
    } else if (body.action === 'archive') {
      updated = await db
        .update(schema.notifications)
        .set({ archivedAt: now, read: true, readAt: now })
        .where(ownerGuard)
        .returning({ id: schema.notifications.id });
    }

    if (updated.length === 0) {
      throw new ApiError(404, 'اعلان پیدا نشد', 'NOT_FOUND');
    }

    // Return authoritative unread count after mutation
    const [countRow] = await db
      .select({ c: sql<number>`COUNT(*)::int` })
      .from(schema.notifications)
      .where(and(
        eq(schema.notifications.userId, userId),
        eq(schema.notifications.read, false),
        isNull(schema.notifications.archivedAt)
      ));
    const unreadCount = countRow?.c ?? 0;

    return NextResponse.json({ ok: true, unreadCount });
  } catch (e) {
    return handleError(e);
  }
}
