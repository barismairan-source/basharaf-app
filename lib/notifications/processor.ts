/**
 * Outbox processor core logic.
 *
 * Called by POST /api/internal/notifications/process.
 * Handles claiming, dispatching, and updating outbox rows.
 *
 * Design:
 * - Claim phase runs inside a transaction with FOR UPDATE SKIP LOCKED
 * - Provider calls run OUTSIDE the claim transaction
 * - Each row is updated independently — one failure does not abort the batch
 * - Returns counts only — never returns payloads, addresses, or secrets
 */

import { and, eq, lt, inArray, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { sendOutboxSms } from './channels/sms';
import { sendNotificationEmail } from './channels/email';
import { nextAttemptAt, isLockStale, DEFAULT_MAX_ATTEMPTS, nextDayMidnightTehran } from './retry';
import { redactError } from './redaction';
import { isSafeActionUrl, absoluteUrl } from './templates';
import { logEvent } from '@/lib/logger';

const BATCH_SIZE = 25;
const STALE_LOCK_MS = 15 * 60 * 1000;

/**
 * Builds the SMS message text.
 * Appends a safe absolute link when actionUrl is safe.
 * Truncates the text part to stay within maxLength characters total.
 * The link is never truncated — it is either included in full or omitted.
 */
export function buildSmsMessage(
  title: string,
  sub: string,
  actionUrl: string | null,
  maxLength = 160
): string {
  const candidateLink = isSafeActionUrl(actionUrl) ? `\n${absoluteUrl(actionUrl!)}` : '';
  // If the link alone cannot fit, omit it so the message never exceeds maxLength.
  const safeLink   = candidateLink.length <= maxLength ? candidateLink : '';
  const maxTextLen = maxLength - safeLink.length;
  let textPart     = sub ? `${title}: ${sub}` : title;
  if (textPart.length > maxTextLen) {
    textPart = textPart.slice(0, Math.max(0, maxTextLen - 1)) + '…';
  }
  return textPart + safeLink;
}

export interface ProcessorResult {
  processed: number;
  sent:      number;
  failed:    number;
  dead:      number;
  skipped:   number;
}

type OutboxRow = {
  id: string;
  channel: string;
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
  rule_key: string;
  recipient_id: string | null;
};

/**
 * Claims and processes up to BATCH_SIZE due outbox rows.
 * Never throws — exceptions are caught and counted as failures.
 */
export async function processOutboxBatch(
  lockOwner: string = crypto.randomUUID()
): Promise<ProcessorResult> {
  const result: ProcessorResult = { processed: 0, sent: 0, failed: 0, dead: 0, skipped: 0 };

  // ── Step 1: Recover stale locks ──────────────────────────────
  const staleThreshold = new Date(Date.now() - STALE_LOCK_MS);
  await db
    .update(schema.notificationOutbox)
    .set({ status: 'pending', lockTime: null, lockOwner: null })
    .where(
      and(
        eq(schema.notificationOutbox.status, 'processing'),
        lt(schema.notificationOutbox.lockTime!, staleThreshold)
      )
    );

  // ── Step 2: Claim rows ────────────────────────────────────────
  const claimedRows = await db.transaction(async (tx) => {
    const due = await tx.execute(
      sql`
        SELECT id, channel, payload, attempts, max_attempts, rule_key, recipient_id
        FROM notification_outbox
        WHERE status IN ('pending')
          AND next_attempt_at <= NOW()
        ORDER BY next_attempt_at ASC
        LIMIT ${BATCH_SIZE}
        FOR UPDATE SKIP LOCKED
      `
    ) as unknown as OutboxRow[];

    if (due.length === 0) return [];

    const ids = due.map((r) => r.id);
    await tx
      .update(schema.notificationOutbox)
      .set({ status: 'processing', lockTime: new Date(), lockOwner })
      .where(inArray(schema.notificationOutbox.id, ids));

    return due;
  });

  if (claimedRows.length === 0) return result;

  // ── Step 3: Dispatch each row independently ──────────────────
  for (const row of claimedRows) {
    result.processed++;

    try {
      if (!row.recipient_id) {
        // Recipient was deleted — skip permanently
        result.skipped++;
        await db
          .update(schema.notificationOutbox)
          .set({ status: 'skipped', lastError: 'recipient deleted', lockTime: null, lockOwner: null, updatedAt: new Date() })
          .where(eq(schema.notificationOutbox.id, row.id));
        continue;
      }

      // Resolve recipient address
      const [user] = await db
        .select({ smsPhone: schema.users.smsPhone, email: schema.users.email })
        .from(schema.users)
        .where(eq(schema.users.id, row.recipient_id))
        .limit(1);

      // Extract content from payload (stored at enqueue time — no DB lookup needed)
      const payloadTitle    = typeof row.payload.title     === 'string' ? row.payload.title     : row.rule_key;
      const payloadSub      = typeof row.payload.sub       === 'string' ? row.payload.sub       : '';
      const payloadActionUrl = typeof row.payload.actionUrl === 'string' ? row.payload.actionUrl : null;

      let deliveryResult: Awaited<ReturnType<typeof sendOutboxSms>>;

      if (row.channel === 'sms') {
        if (!user?.smsPhone) {
          deliveryResult = { status: 'skipped', error: 'no phone on record' };
        } else {
          const message = buildSmsMessage(payloadTitle, payloadSub, payloadActionUrl);
          deliveryResult = await sendOutboxSms({
            phone:       user.smsPhone,
            message,
            templateKey: row.rule_key,
            entityId:    typeof row.payload.entityId === 'string' ? row.payload.entityId : undefined,
          });
        }
      } else if (row.channel === 'email') {
        if (!user?.email) {
          deliveryResult = { status: 'skipped', error: 'no email on record' };
        } else {
          deliveryResult = await sendNotificationEmail({
            to: user.email,
            data: {
              title:     payloadTitle,
              sub:       payloadSub,
              actionUrl: payloadActionUrl,
            },
          });
        }
      } else {
        deliveryResult = { status: 'skipped', error: `unknown channel: ${row.channel}` };
      }

      // ── Update row based on result ──────────────────────────
      const attempts    = row.attempts + 1;
      const maxAttempts = row.max_attempts ?? DEFAULT_MAX_ATTEMPTS;

      if (deliveryResult.status === 'sent') {
        result.sent++;
        await db
          .update(schema.notificationOutbox)
          .set({
            status:        'sent',
            attempts,
            providerMsgId: deliveryResult.providerMsgId ?? null,
            sentAt:        new Date(),
            lockTime:      null,
            lockOwner:     null,
            updatedAt:     new Date(),
          })
          .where(eq(schema.notificationOutbox.id, row.id));

      } else if (deliveryResult.status === 'skipped') {
        result.skipped++;
        await db
          .update(schema.notificationOutbox)
          .set({
            status:    'skipped',
            attempts,
            lastError: deliveryResult.error ?? null,
            lockTime:  null,
            lockOwner: null,
            updatedAt: new Date(),
          })
          .where(eq(schema.notificationOutbox.id, row.id));

      } else {
        // failed — schedule retry or mark dead
        // Use Tehran midnight for cap-exceeded rows; normal backoff otherwise
        const nextAt = deliveryResult.capExceeded
          ? nextDayMidnightTehran()
          : nextAttemptAt(attempts, maxAttempts);

        if (nextAt === null) {
          result.dead++;
          await db
            .update(schema.notificationOutbox)
            .set({
              status:    'dead',
              attempts,
              lastError: redactError(deliveryResult.error),
              lockTime:  null,
              lockOwner: null,
              updatedAt: new Date(),
            })
            .where(eq(schema.notificationOutbox.id, row.id));
        } else {
          result.failed++;
          await db
            .update(schema.notificationOutbox)
            .set({
              status:        'pending',
              attempts,
              nextAttemptAt: nextAt,
              lastError:     redactError(deliveryResult.error),
              lockTime:      null,
              lockOwner:     null,
              updatedAt:     new Date(),
            })
            .where(eq(schema.notificationOutbox.id, row.id));
        }
      }
    } catch (err) {
      result.failed++;
      await logEvent({
        level:    'error',
        category: 'notification',
        message:  'outbox processor row error',
        context:  { rowId: row.id, error: redactError(err) },
      }).catch(() => {});

      const attempts = row.attempts + 1;
      const nextAt = nextAttemptAt(attempts, row.max_attempts ?? DEFAULT_MAX_ATTEMPTS);
      await db
        .update(schema.notificationOutbox)
        .set({
          status:        nextAt ? 'pending' : 'dead',
          attempts,
          nextAttemptAt: nextAt ?? new Date(),
          lastError:     redactError(err),
          lockTime:      null,
          lockOwner:     null,
          updatedAt:     new Date(),
        })
        .where(eq(schema.notificationOutbox.id, row.id))
        .catch(() => {});
    }
  }

  return result;
}
