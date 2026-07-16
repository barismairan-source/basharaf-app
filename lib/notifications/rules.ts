/**
 * Rule resolution for notification service V2.
 */

import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';

export interface ResolvedRule {
  enabled: boolean;
  inAppEnabled: boolean;
  smsEnabled: boolean;
  emailEnabled: boolean;
}

/** Resolves a notification rule from DB. Returns null if not found. */
export async function resolveRule(
  ruleKey: string,
  client: typeof db = db
): Promise<ResolvedRule | null> {
  const [rule] = await client
    .select({
      enabled:      schema.notificationRules.enabled,
      inAppEnabled: schema.notificationRules.inAppEnabled,
      smsEnabled:   schema.notificationRules.smsEnabled,
      emailEnabled: schema.notificationRules.emailEnabled,
    })
    .from(schema.notificationRules)
    .where(eq(schema.notificationRules.key, ruleKey))
    .limit(1);

  if (!rule) return null;
  return rule as ResolvedRule;
}

/** Returns true if the in-app channel should create a notification row. */
export function shouldSendInApp(rule: ResolvedRule): boolean {
  return rule.enabled && rule.inAppEnabled;
}

/** Returns true if an SMS outbox row should be enqueued. */
export function shouldEnqueueSms(rule: ResolvedRule, callerAllows: boolean): boolean {
  return rule.enabled && rule.smsEnabled && callerAllows;
}

/**
 * Returns true if an email outbox row should be enqueued.
 * Note: SMTP configuration is NOT checked here — the enqueue decision is based solely
 * on the DB rule. If SMTP is temporarily unavailable, the processor retries rather than
 * silently dropping the event. Activating emailEnabled without valid SMTP is blocked
 * at the admin panel level (SMTP guard in notification-rules PATCH).
 */
export function shouldEnqueueEmail(rule: ResolvedRule, callerAllows: boolean): boolean {
  return rule.enabled && rule.emailEnabled && callerAllows;
}
