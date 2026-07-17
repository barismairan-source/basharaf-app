/**
 * Outbox enqueue helper for notification service V2.
 *
 * Inserts a row into notification_outbox using ON CONFLICT DO NOTHING
 * so duplicate business events are idempotent.
 *
 * Privacy contract:
 * - payload contains ONLY routing data + content (title/sub/actionUrl)
 * - no phone numbers, email addresses, resume data, or form answers
 * - recipientId is stored in the column, not duplicated in payload
 */

import { db, schema } from '@/lib/db/client';
import type { OutboxChannel } from './types';

type InsertClient = Pick<typeof db, 'insert'>;

export interface EnqueueOutboxParams {
  ruleKey:        string;
  /**
   * Stable event key — must be computed ONCE per invocation in service.ts and
   * shared across all recipients and channels of the same event.
   * Never generated here; always passed by the caller.
   * Priority: idempotencyKey ?? entityId ?? crypto.randomUUID() (computed in service)
   */
  eventKey:       string;
  channel:        OutboxChannel;
  recipientId:    string;
  entityId:       string | null;
  notificationId: string | null;
  /** Content for processor to build the SMS/email body */
  title:          string;
  sub:            string;
  actionUrl:      string | null;
  maxAttempts?:   number;
}

/**
 * Derives a stable dedupe key for an outbox row.
 * Format: {ruleKey}:{eventKey}:{recipientId}:{channel}
 *
 * `eventKey` must be a non-null string. When entityId is present, the caller
 * passes entityId. When entityId is null, the caller generates a UUID per
 * invocation (shared across all recipients and channels of that event).
 */
export function buildOutboxDedupeKey(
  ruleKey: string,
  eventKey: string,
  recipientId: string,
  channel: OutboxChannel
): string {
  return `${ruleKey}:${eventKey}:${recipientId}:${channel}`;
}

/**
 * Derives a stable dedupe key for a notification row.
 * Format: {ruleKey}:{eventKey}:{userId}
 *
 * `eventKey` follows the same convention as buildOutboxDedupeKey.
 */
export function buildNotifDedupeKey(
  ruleKey: string,
  eventKey: string,
  userId: string
): string {
  return `${ruleKey}:${eventKey}:${userId}`;
}

/**
 * Enqueues a single outbox row.
 * Uses ON CONFLICT DO NOTHING — safe to call multiple times with the same eventKey.
 * Returns the inserted row id or null if deduped.
 */
export async function enqueueOutbox(
  params: EnqueueOutboxParams,
  client: InsertClient = db
): Promise<string | null> {
  const dedupeKey = buildOutboxDedupeKey(
    params.ruleKey,
    params.eventKey,
    params.recipientId,
    params.channel
  );

  // recipientId is in the column; do NOT duplicate it in the payload
  const payload = {
    ruleKey:   params.ruleKey,
    entityId:  params.entityId,
    title:     params.title,
    sub:       params.sub,
    actionUrl: params.actionUrl,
  };

  const rows = await client
    .insert(schema.notificationOutbox)
    .values({
      ruleKey:        params.ruleKey,
      channel:        params.channel,
      recipientId:    params.recipientId,
      notificationId: params.notificationId,
      payload,
      dedupeKey,
      status:         'pending',
      attempts:       0,
      maxAttempts:    params.maxAttempts ?? 5,
    })
    .onConflictDoNothing()
    .returning({ id: schema.notificationOutbox.id });

  return rows[0]?.id ?? null;
}
