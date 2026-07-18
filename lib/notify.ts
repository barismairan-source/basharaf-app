/**
 * lib/notify.ts — backward-compatible entry point for notifications.
 *
 * V2: delegates to lib/notifications/service.ts for new callers.
 * Existing callers (transactions, inventory, anomaly) continue to work unchanged.
 *
 * Public exports are unchanged — no existing route requires modification.
 */
import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { notifyAdminsV2 } from '@/lib/notifications/service';

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];
import type { NotificationType } from '@/types';

export interface NotifyParams {
  type: NotificationType;
  title: string;
  sub: string;
  /** null → اعلان برای همه (SuperAdmin‌ها) — deprecated in V2; use notifyAdmins */
  userId: string | null;
  txId?: string | null;
  actionUrl?: string | null;
  entityId?: string | null;
  /** کلید قانون */
  ruleKey?: string;
  /** شعبه‌ی مرتبط با رویداد — برای targeting نوع 'event_branch' در notifyAdmins */
  branchId?: string | null;
}

/** ایجاد یک اعلان (با بررسی قانون) — legacy single-user path */
export async function notify(params: NotifyParams): Promise<void> {
  if (params.ruleKey) {
    const [rule] = await db
      .select({ enabled: schema.notificationRules.enabled })
      .from(schema.notificationRules)
      .where(eq(schema.notificationRules.key, params.ruleKey))
      .limit(1);
    if (rule && !rule.enabled) return;
  }

  await db.insert(schema.notifications).values({
    type:      params.type,
    title:     params.title,
    sub:       params.sub,
    time:      'به‌تازگی',
    read:      false,
    txId:      params.txId ?? null,
    actionUrl: params.actionUrl ?? null,
    entityId:  params.entityId ?? null,
    userId:    params.userId,
    ruleKey:   params.ruleKey ?? null,
  });
}

export interface NotifyAdminsOptions {
  /** Enqueue SMS outbox row (requires rule.sms_enabled=true) */
  sms?: boolean;
  /** Enqueue email outbox row (requires rule.email_enabled=true + SMTP configured) */
  email?: boolean;
}

/**
 * اعلان به تمام SuperAdminها.
 * Delegates to V2 service when ruleKey is provided (preferred path).
 * Falls back to direct insert when called without ruleKey (legacy callers).
 */
export async function notifyAdmins(
  params: Omit<NotifyParams, 'userId'>,
  tx?: DbTx,
  options?: NotifyAdminsOptions
): Promise<void> {
  if (params.ruleKey) {
    return notifyAdminsV2(
      {
        ruleKey:   params.ruleKey,
        type:      params.type,
        title:     params.title,
        sub:       params.sub,
        actionUrl: params.actionUrl,
        entityId:  params.entityId,
        txId:      params.txId,
        branchId:  params.branchId,
      },
      { sms: options?.sms, email: options?.email },
      tx
    );
  }

  // Legacy fallback: no rule key — direct insert for active admins only
  const client = tx ?? db;
  const admins = await (client as typeof db)
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(and(eq(schema.users.role, 'SuperAdmin'), eq(schema.users.isActive, true)));

  if (admins.length === 0) return;

  await (client as typeof db).insert(schema.notifications).values(
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
    }))
  );
}

/** آستانه‌ی یک قانون را برمی‌گرداند */
export async function getRuleThreshold(key: string): Promise<number | null> {
  const [rule] = await db
    .select({ threshold: schema.notificationRules.threshold, enabled: schema.notificationRules.enabled })
    .from(schema.notificationRules)
    .where(eq(schema.notificationRules.key, key))
    .limit(1);
  if (!rule || !rule.enabled) return null;
  return rule.threshold;
}
