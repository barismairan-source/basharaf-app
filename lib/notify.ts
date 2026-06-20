/**
 * lib/notify.ts — helper مرکزی برای ایجاد اعلان‌ها.
 *
 * همه API route‌ها باید از این helper استفاده کنند تا:
 * ۱. کنفیگ NotificationRules رعایت شود (اگر قانون disabled باشد، اعلان ساخته نمی‌شود)
 * ۲. actionUrl و entityId به‌طور یکپارچه مقداردهی شوند
 * ۳. اعلان‌های SuperAdmin و کاربر ایجادکننده به درستی روت شوند
 */
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import type { NotificationType } from '@/types';

export interface NotifyParams {
  type: NotificationType;
  title: string;
  sub: string;
  /** null → اعلان برای همه (SuperAdmin‌ها) */
  userId: string | null;
  txId?: string | null;
  actionUrl?: string | null;
  entityId?: string | null;
  /** کلید قانون — اگر داده شود، ابتدا بررسی می‌شود enabled باشد */
  ruleKey?: string;
}

/** ایجاد یک اعلان (با بررسی قانون) */
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
    type: params.type,
    title: params.title,
    sub: params.sub,
    time: 'به‌تازگی',
    read: false,
    txId: params.txId ?? null,
    actionUrl: params.actionUrl ?? null,
    entityId: params.entityId ?? null,
    userId: params.userId,
  });
}

/** اعلان به تمام SuperAdminها (با بررسی قانون) */
export async function notifyAdmins(
  params: Omit<NotifyParams, 'userId'>,
  tx?: any
): Promise<void> {
  const client: typeof db = tx ?? db;

  if (params.ruleKey) {
    const [rule] = await client
      .select({ enabled: schema.notificationRules.enabled })
      .from(schema.notificationRules)
      .where(eq(schema.notificationRules.key, params.ruleKey))
      .limit(1);
    if (rule && !rule.enabled) return;
  }

  const admins = await client
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.role, 'SuperAdmin'));

  if (admins.length === 0) return;

  await client.insert(schema.notifications).values(
    admins.map((admin) => ({
      type: params.type,
      title: params.title,
      sub: params.sub.slice(0, 255),
      time: 'به‌تازگی',
      read: false,
      txId: params.txId ?? null,
      actionUrl: params.actionUrl ?? null,
      entityId: params.entityId ?? null,
      userId: admin.id,
    }))
  );
}

/** آستانه‌ی یک قانون را برمی‌گرداند — برای مقایسه در runtime */
export async function getRuleThreshold(key: string): Promise<number | null> {
  const [rule] = await db
    .select({ threshold: schema.notificationRules.threshold, enabled: schema.notificationRules.enabled })
    .from(schema.notificationRules)
    .where(eq(schema.notificationRules.key, key))
    .limit(1);
  if (!rule || !rule.enabled) return null;
  return rule.threshold;
}
