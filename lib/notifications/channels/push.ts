/**
 * Web Push channel adapter — server-only.
 *
 * A user may have multiple subscriptions (one per browser/device); all are
 * targeted. Any single successful delivery counts the outbox row as 'sent'.
 * Expired/invalid subscriptions (410 Gone, 404 Not Found — the browser's
 * push service confirms the endpoint no longer exists) are deleted so they
 * stop being retried forever; this is standard Web Push hygiene, not an
 * error condition.
 *
 * Required env vars: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
 * (mailto: address or https: URL — required by the Push spec so push
 * services can contact the sender if something goes wrong).
 *
 * Privacy contract:
 * - payload contains only title/body/url — no phone, email, resume, or answers
 * - push subscription endpoints/keys never appear in logs or error messages
 */

import webpush from 'web-push';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { redactError } from '@/lib/notifications/redaction';
import { isSafeActionUrl, absoluteUrl } from '@/lib/notifications/templates';
import type { DeliveryResult } from '@/lib/notifications/types';

interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

function readConfig(): VapidConfig | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return null;
  return { publicKey, privateKey, subject };
}

/** Returns true when all required VAPID env vars are present. */
export function isPushConfigured(): boolean {
  return readConfig() !== null;
}

let _vapidSet = false;
function ensureVapidDetails(cfg: VapidConfig): void {
  if (_vapidSet) return;
  webpush.setVapidDetails(cfg.subject, cfg.publicKey, cfg.privateKey);
  _vapidSet = true;
}

export interface SendPushParams {
  userId: string;
  title: string;
  sub: string;
  actionUrl: string | null;
}

/**
 * Sends a push notification to every subscription on record for userId.
 * Returns a DeliveryResult — never throws.
 */
export async function sendPushToUser(params: SendPushParams): Promise<DeliveryResult> {
  const cfg = readConfig();
  if (!cfg) {
    // Same rationale as email: retryable, not a permanent skip — the admin
    // panel guard prevents enabling push rules without VAPID configured, so
    // a missing config here means a temporary outage.
    return { status: 'failed', error: 'VAPID not configured — will retry when available' };
  }
  ensureVapidDetails(cfg);

  const subscriptions = await db
    .select()
    .from(schema.pushSubscriptions)
    .where(eq(schema.pushSubscriptions.userId, params.userId));

  if (subscriptions.length === 0) {
    return { status: 'skipped', error: 'no push subscription on record' };
  }

  const safeUrl = isSafeActionUrl(params.actionUrl) ? absoluteUrl(params.actionUrl!) : '/dashboard';
  const payload = JSON.stringify({
    title: params.title,
    body: params.sub,
    url: safeUrl,
  });

  let anySent = false;
  let lastError: string | undefined;
  const expiredIds: string[] = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        anySent = true;
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          expiredIds.push(sub.id);
        } else {
          lastError = redactError(err);
        }
      }
    })
  );

  if (expiredIds.length > 0) {
    await db.delete(schema.pushSubscriptions).where(
      // Delete each expired subscription individually — no bulk inArray
      // needed here since expiredIds is bounded by one user's device count.
      eq(schema.pushSubscriptions.id, expiredIds[0]!)
    ).catch(() => {});
    for (const id of expiredIds.slice(1)) {
      await db.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.id, id)).catch(() => {});
    }
  }

  if (anySent) {
    return { status: 'sent' };
  }
  if (expiredIds.length === subscriptions.length) {
    // Every subscription was expired and has now been removed.
    return { status: 'skipped', error: 'all push subscriptions expired' };
  }
  return { status: 'failed', error: lastError ?? 'push delivery failed' };
}
