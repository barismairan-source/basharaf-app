/**
 * GET  /api/admin/notification-outbox — outbox summary + paginated failed/dead rows
 * POST /api/admin/notification-outbox — retry dead rows (bulk) or retry one row (single)
 *
 * Privacy contract:
 * - Returns counts and masked recipient contact info only
 * - No raw phone numbers, email addresses, or payloads
 *
 * Cursor contract:
 * - Compound (updatedAt, id) encoded as base64 JSON
 * - id must be a valid UUID — invalid cursor → 400 INVALID_CURSOR
 * - Rows with equal updatedAt are ordered by id DESC — no row is skipped or doubled
 *
 * Retry contract:
 * - retry-one uses a single atomic UPDATE WHERE id=? AND status IN ('dead','failed')
 * - If UPDATE returns 0 rows: check existence to distinguish 404 vs 422
 * - No SELECT-then-UPDATE race: a concurrent 'sent'/'processing' row cannot be re-queued
 */

import { NextResponse } from 'next/server';
import { and, desc, eq, inArray, lt, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { handleError, ApiError } from '@/lib/api-error';
import { maskPhone, maskEmail } from '@/lib/notifications/redaction';
import { isEmailConfigured } from '@/lib/notifications/channels/email';
import { encodeCursor, decodeCursor } from '@/lib/notifications/cursor';

export const dynamic = 'force-dynamic';

const GET_LIMIT = 25;

// ─── Cursor wrapper — maps codec errors to ApiError ──────────────

function parseCursor(cursor: string): { at: Date; id: string } {
  try {
    return decodeCursor(cursor);
  } catch {
    throw new ApiError(400, 'نشانگر صفحه نامعتبر است', 'INVALID_CURSOR');
  }
}

// ─── GET ──────────────────────────────────────────────────────────

export async function GET(req: Request) {
  try {
    await requireAdmin();

    const url    = new URL(req.url);
    const cursor = url.searchParams.get('cursor') ?? undefined;

    // Status distribution
    const countRows = await db.execute<{ status: string; count: string }>(
      sql`SELECT status, COUNT(*)::text AS count FROM notification_outbox GROUP BY status`
    ) as unknown as Array<{ status: string; count: string }>;

    const counts: Record<string, number> = {};
    for (const row of countRows) {
      counts[row.status] = parseInt(row.count, 10);
    }

    // Sent today — anchored to Tehran midnight (not UTC midnight)
    // date_trunc('day', NOW() AT TIME ZONE 'Asia/Tehran') produces Tehran midnight as a
    // local timestamp; the final AT TIME ZONE 'Asia/Tehran' converts it to UTC timestamptz.
    const [todayRow] = await db.execute<{ count: string }>(
      sql`SELECT COUNT(*)::text AS count FROM notification_outbox
          WHERE status = 'sent'
            AND sent_at >= date_trunc('day', NOW() AT TIME ZONE 'Asia/Tehran') AT TIME ZONE 'Asia/Tehran'`
    ) as unknown as Array<{ count: string }>;
    const sentToday = parseInt(todayRow?.count ?? '0', 10);

    // Age of oldest pending row — use created_at (not next_attempt_at which can be future)
    // GREATEST(0, ...) prevents negative values when the row was created in the future
    const [oldestRow] = await db.execute<{ age_seconds: string | null }>(
      sql`SELECT GREATEST(0, EXTRACT(EPOCH FROM (NOW() - MIN(created_at))))::text AS age_seconds
          FROM notification_outbox WHERE status = 'pending'`
    ) as unknown as Array<{ age_seconds: string | null }>;
    const oldestPendingAgeSeconds = oldestRow?.age_seconds !== null && oldestRow?.age_seconds !== undefined
      ? Math.floor(parseFloat(oldestRow.age_seconds))
      : null;

    // Compound cursor WHERE — (updatedAt, id) DESC order
    let cursorWhere = undefined;
    if (cursor) {
      const { at: cursorAt, id: cursorId } = parseCursor(cursor);
      cursorWhere = or(
        lt(schema.notificationOutbox.updatedAt, cursorAt),
        and(
          eq(schema.notificationOutbox.updatedAt, cursorAt),
          lt(schema.notificationOutbox.id, cursorId)
        )
      );
    }

    const rows = await db
      .select({
        id:            schema.notificationOutbox.id,
        ruleKey:       schema.notificationOutbox.ruleKey,
        channel:       schema.notificationOutbox.channel,
        status:        schema.notificationOutbox.status,
        attempts:      schema.notificationOutbox.attempts,
        maxAttempts:   schema.notificationOutbox.maxAttempts,
        lastError:     schema.notificationOutbox.lastError,
        nextAttemptAt: schema.notificationOutbox.nextAttemptAt,
        createdAt:     schema.notificationOutbox.createdAt,
        updatedAt:     schema.notificationOutbox.updatedAt,
        smsPhone:      schema.users.smsPhone,
        email:         schema.users.email,
      })
      .from(schema.notificationOutbox)
      .leftJoin(schema.users, eq(schema.notificationOutbox.recipientId, schema.users.id))
      .where(
        and(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          sql`${schema.notificationOutbox.status} IN ('failed', 'dead')` as any,
          cursorWhere
        )
      )
      .orderBy(desc(schema.notificationOutbox.updatedAt), desc(schema.notificationOutbox.id))
      .limit(GET_LIMIT + 1);

    const hasMore    = rows.length > GET_LIMIT;
    const page       = rows.slice(0, GET_LIMIT);
    const lastRow    = page[page.length - 1];
    const nextCursor = hasMore && lastRow
      ? encodeCursor(lastRow.updatedAt, lastRow.id)
      : null;

    return NextResponse.json({
      summary: {
        pending:               counts['pending']    ?? 0,
        processing:            counts['processing'] ?? 0,
        dead:                  counts['dead']       ?? 0,
        sentToday,
        oldestPendingAgeSeconds,
        smsConfigured:         !!(process.env.KAVENEGAR_API_KEY),
        emailConfigured:       isEmailConfigured(),
      },
      counts,
      recentProblematic: page.map((r) => ({
        id:            r.id,
        ruleKey:       r.ruleKey,
        channel:       r.channel,
        status:        r.status,
        attempts:      r.attempts,
        maxAttempts:   r.maxAttempts,
        lastError:     r.lastError ?? null,
        nextAttemptAt: r.nextAttemptAt?.toISOString() ?? null,
        createdAt:     r.createdAt.toISOString(),
        updatedAt:     r.updatedAt.toISOString(),
        maskedRecipient: r.channel === 'sms' && r.smsPhone
          ? maskPhone(r.smsPhone)
          : r.channel === 'email' && r.email
            ? maskEmail(r.email)
            : null,
      })),
      nextCursor,
    });
  } catch (e) {
    return handleError(e);
  }
}

// ─── POST ─────────────────────────────────────────────────────────

const RETRYABLE_STATUSES = ['dead', 'failed'] as const;

const retryBodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('retry-dead') }),
  z.object({ action: z.literal('retry-one'), id: z.string().uuid() }),
]);

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const raw = await req.json().catch(() => ({}));
    const parsed = retryBodySchema.safeParse(raw);
    if (!parsed.success) {
      throw new ApiError(400, 'پارامترهای نامعتبر', 'INVALID_PARAMS');
    }

    if (parsed.data.action === 'retry-dead') {
      const result = await db
        .update(schema.notificationOutbox)
        .set({ status: 'pending', nextAttemptAt: new Date(), lockTime: null, lockOwner: null, updatedAt: new Date() })
        .where(eq(schema.notificationOutbox.status, 'dead'))
        .returning({ id: schema.notificationOutbox.id });

      return NextResponse.json({ ok: true, retried: result.length });
    }

    // retry-one: atomic UPDATE WHERE id=? AND status IN ('dead','failed')
    // If a concurrent processor claimed this row, the UPDATE returns 0 rows — no race possible.
    const { id } = parsed.data;
    const updated = await db
      .update(schema.notificationOutbox)
      .set({ status: 'pending', nextAttemptAt: new Date(), lockTime: null, lockOwner: null, updatedAt: new Date() })
      .where(
        and(
          eq(schema.notificationOutbox.id, id),
          inArray(schema.notificationOutbox.status, [...RETRYABLE_STATUSES])
        )
      )
      .returning({ id: schema.notificationOutbox.id });

    if (updated.length > 0) {
      return NextResponse.json({ ok: true, retried: 1 });
    }

    // UPDATE returned 0 rows — check why (404 vs 422)
    const [existing] = await db
      .select({ status: schema.notificationOutbox.status })
      .from(schema.notificationOutbox)
      .where(eq(schema.notificationOutbox.id, id))
      .limit(1);

    if (!existing) {
      throw new ApiError(404, 'ردیف outbox پیدا نشد', 'NOT_FOUND');
    }

    throw new ApiError(
      422,
      `ردیف با وضعیت «${existing.status}» قابل تلاش مجدد نیست`,
      'NOT_RETRYABLE'
    );
  } catch (e) {
    return handleError(e);
  }
}
