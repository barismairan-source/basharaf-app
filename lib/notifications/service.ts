/**
 * Notification service V2 — central entry point.
 *
 * Design:
 * - All DB reads and writes (rule, recipients, notifications, outbox) use
 *   the same transaction client — either the caller's outerTx or a new tx.
 * - eventKey is computed ONCE per invocation and shared across all recipients
 *   and channels so dedup keys are consistent.
 * - Returns void — callers fire-and-forget with .catch()
 */

import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { resolveRule, shouldSendInApp, shouldEnqueueSms, shouldEnqueueEmail } from './rules';
import { enqueueOutbox, buildNotifDedupeKey } from './outbox';
import { fetchAudienceTargets, fetchCandidateUsers, resolveAudience } from './audience';
import { logEvent } from '@/lib/logger';
import { redactError } from './redaction';
import type { NotifyAdminsParams, NotifyAdminsChannelOptions } from './types';

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Client = DbTx | typeof db;

/**
 * Resolves per-channel recipients (each channel may have its own audience —
 * see lib/notifications/audience.ts) then writes in-app rows and enqueues
 * outbox rows. Every recipient here has already passed the eligibility gate
 * (active, has the rule's required access, has a usable address for the
 * channel) — no further filtering happens at write time.
 */
async function runBatch(
  params: NotifyAdminsParams,
  eventKey: string,
  doInApp: boolean,
  doSms: boolean,
  doEmail: boolean,
  client: Client
): Promise<void> {
  const eventBranchId = params.branchId ?? null;

  const [targets, users] = await Promise.all([
    fetchAudienceTargets(params.ruleKey, client),
    fetchCandidateUsers(client),
  ]);

  const inAppIds = new Set(
    doInApp
      ? resolveAudience({ ruleKey: params.ruleKey, channel: 'in_app', targets, users, eventBranchId })
          .filter((r) => r.eligible).map((r) => r.userId)
      : []
  );
  const smsIds = new Set(
    doSms
      ? resolveAudience({ ruleKey: params.ruleKey, channel: 'sms', targets, users, eventBranchId })
          .filter((r) => r.eligible).map((r) => r.userId)
      : []
  );
  const emailIds = new Set(
    doEmail
      ? resolveAudience({ ruleKey: params.ruleKey, channel: 'email', targets, users, eventBranchId })
          .filter((r) => r.eligible).map((r) => r.userId)
      : []
  );

  const allRecipientIds = new Set<string>([...inAppIds, ...smsIds, ...emailIds]);

  for (const userId of allRecipientIds) {
    let notifId: string | null = null;

    if (inAppIds.has(userId)) {
      const dedupeKey = buildNotifDedupeKey(params.ruleKey, eventKey, userId);

      const rows = await (client as typeof db)
        .insert(schema.notifications)
        .values({
          type:      params.type,
          title:     params.title,
          sub:       params.sub.slice(0, 255),
          time:      'به‌تازگی',
          read:      false,
          txId:      params.txId ?? null,
          actionUrl: params.actionUrl ?? null,
          entityId:  params.entityId ?? null,
          userId,
          ruleKey:   params.ruleKey,
          priority:  params.priority ?? 0,
          dedupeKey,
        })
        .onConflictDoNothing()
        .returning({ id: schema.notifications.id });

      notifId = rows[0]?.id ?? null;
    }

    if (smsIds.has(userId)) {
      await enqueueOutbox(
        {
          ruleKey:        params.ruleKey,
          eventKey,
          channel:        'sms',
          recipientId:    userId,
          entityId:       params.entityId ?? null,
          notificationId: notifId,
          title:          params.title,
          sub:            params.sub,
          actionUrl:      params.actionUrl ?? null,
        },
        client as Pick<typeof db, 'insert'>
      );
    }

    if (emailIds.has(userId)) {
      await enqueueOutbox(
        {
          ruleKey:        params.ruleKey,
          eventKey,
          channel:        'email',
          recipientId:    userId,
          entityId:       params.entityId ?? null,
          notificationId: notifId,
          title:          params.title,
          sub:            params.sub,
          actionUrl:      params.actionUrl ?? null,
        },
        client as Pick<typeof db, 'insert'>
      );
    }
  }
}

/**
 * All reads and writes for a single notifyAdminsV2 invocation run inside
 * one consistent transaction so outerTx callers see a coherent view.
 */
async function notifyWithClient(
  params: NotifyAdminsParams,
  options: NotifyAdminsChannelOptions,
  client: Client
): Promise<void> {
  const rule = await resolveRule(params.ruleKey, client as typeof db);
  if (!rule || !rule.enabled) return;

  const doInApp  = shouldSendInApp(rule);
  // Caller declares channel support (defaults to true); DB rule gates actual sending
  const doSms    = shouldEnqueueSms(rule, options.sms ?? true);
  const doEmail  = shouldEnqueueEmail(rule, options.email ?? true);

  if (!doInApp && !doSms && !doEmail) return;

  // eventKey computed ONCE, shared across all recipients and channels of this event
  const eventKey = params.idempotencyKey ?? params.entityId ?? crypto.randomUUID();

  // Recipient resolution (per-channel audience, access gating, address
  // readiness) happens inside runBatch — see lib/notifications/audience.ts.
  await runBatch(params, eventKey, doInApp, doSms, doEmail, client);
}

/**
 * Creates in-app notifications for all active SuperAdmins and enqueues
 * outbox rows for each enabled delivery channel.
 *
 * If `outerTx` is provided, ALL operations (reads + writes) run inside it.
 * Otherwise, a new transaction is opened.
 * Fire-and-forget: rejection must be caught by the caller.
 */
export async function notifyAdminsV2(
  params: NotifyAdminsParams,
  options: NotifyAdminsChannelOptions = {},
  outerTx?: DbTx
): Promise<void> {
  if (outerTx) {
    await notifyWithClient(params, options, outerTx);
  } else {
    await db.transaction(async (tx) => {
      await notifyWithClient(params, options, tx);
    });
  }
}

/**
 * Legacy-compatible wrapper. Delegates to notifyAdminsV2.
 */
export async function notifyAdminsCompat(
  params: Omit<NotifyAdminsParams, 'ruleKey'> & { ruleKey?: string },
  options: NotifyAdminsChannelOptions = {}
): Promise<void> {
  if (!params.ruleKey) {
    const admins = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(
        and(
          eq(schema.users.role, 'SuperAdmin'),
          eq(schema.users.isActive, true)
        )
      );

    if (admins.length === 0) return;

    await db.insert(schema.notifications).values(
      admins.map((admin) => ({
        type:      params.type,
        title:     params.title,
        sub:       params.sub.slice(0, 255),
        time:      'به‌تازگی',
        read:      false,
        txId:      params.txId ?? null,
        actionUrl: params.actionUrl ?? null,
        entityId:  params.entityId ?? null,
        userId:    admin.id,
        priority:  params.priority ?? 0,
      }))
    );
    return;
  }

  await notifyAdminsV2(params as NotifyAdminsParams, options).catch((err) => {
    logEvent({
      level:    'error',
      category: 'notification',
      message:  'notifyAdminsV2 failed',
      context:  { ruleKey: params.ruleKey, error: redactError(err) },
    }).catch(() => {});
  });
}
