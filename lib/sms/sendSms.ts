import { and, count, eq, gt, gte, inArray, lt } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { kavenegarSend } from './kavenegar';
import type { SendSmsParams, SendSmsResult } from './types';

const DEFAULT_DAILY_CAP = 5;
const DEFAULT_DEDUP_HOURS = 2;

async function getSetting(key: string, fallback: number): Promise<number> {
  const [row] = await db
    .select({ value: schema.appSettings.value })
    .from(schema.appSettings)
    .where(eq(schema.appSettings.key, key))
    .limit(1);
  const n = row ? parseInt(row.value, 10) : NaN;
  return isNaN(n) ? fallback : n;
}

/**
 * ارسال پیامک با بررسی سقف روزانه و dedup.
 *
 * - Dedup: اگر همان phone+templateKey+entityId در N ساعت گذشته ارسال شده (sent/dry_run) → رد
 * - Cap: تعداد پیامک‌های sent امروز (نه dry_run) برای این شماره ≥ سقف → رد
 * - Dry-run: سقف روزانه را مصرف نمی‌کند (چون پول واقعی خرج نشده)
 */
export async function sendSms(params: SendSmsParams): Promise<SendSmsResult> {
  const { phone, message, templateKey, entityId } = params;

  const [dailyCap, dedupHours] = await Promise.all([
    getSetting('sms.daily_cap_per_phone', DEFAULT_DAILY_CAP),
    getSetting('sms.dedup_window_hours', DEFAULT_DEDUP_HOURS),
  ]);

  // ── Dedup ─────────────────────────────────────────────────────
  if (templateKey && entityId) {
    const dedupCutoff = new Date(Date.now() - dedupHours * 60 * 60 * 1000);
    const [existing] = await db
      .select({ id: schema.smsLog.id })
      .from(schema.smsLog)
      .where(
        and(
          eq(schema.smsLog.phone, phone),
          eq(schema.smsLog.templateKey, templateKey),
          eq(schema.smsLog.entityId, entityId),
          inArray(schema.smsLog.status, ['sent', 'dry_run']),
          gt(schema.smsLog.createdAt, dedupCutoff)
        )
      )
      .limit(1);

    if (existing) {
      const rows = await db
        .insert(schema.smsLog)
        .values({ phone, message, templateKey, entityId, status: 'deduped' })
        .returning({ id: schema.smsLog.id });
      return { status: 'deduped', logId: rows[0]!.id };
    }
  }

  // ── Daily cap (فقط status='sent' حساب می‌شود، نه dry_run) ─────
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart.getTime() + 86400_000);

  const [capRow] = await db
    .select({ n: count() })
    .from(schema.smsLog)
    .where(
      and(
        eq(schema.smsLog.phone, phone),
        eq(schema.smsLog.status, 'sent'),
        gte(schema.smsLog.createdAt, todayStart),
        lt(schema.smsLog.createdAt, tomorrowStart)
      )
    );

  if ((capRow?.n ?? 0) >= dailyCap) {
    const rows = await db
      .insert(schema.smsLog)
      .values({ phone, message, templateKey, entityId, status: 'capped' })
      .returning({ id: schema.smsLog.id });
    return { status: 'capped', logId: rows[0]!.id };
  }

  // ── ارسال ─────────────────────────────────────────────────────
  const result = await kavenegarSend(phone, message);

  const rows = await db
    .insert(schema.smsLog)
    .values({
      phone,
      message,
      templateKey,
      entityId,
      status: result.status,
      providerResponse: result.providerResponse ?? null,
      error: result.error ?? null,
      sentAt: result.status === 'sent' ? new Date() : null,
    })
    .returning({ id: schema.smsLog.id });

  return { status: result.status as SendSmsResult['status'], logId: rows[0]!.id };
}
