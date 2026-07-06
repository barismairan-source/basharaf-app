import { and, eq, gt, ne } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { notifyAdmins } from '@/lib/notify';
import { getTodayJalali } from '@/lib/jalali';
import type { AnomalyFindingInput } from './types';

async function isDuplicate(ruleKey: string, entityId: string | null | undefined): Promise<boolean> {
  if (!entityId) return false;
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ id: schema.anomalyFindings.id })
    .from(schema.anomalyFindings)
    .where(
      and(
        eq(schema.anomalyFindings.ruleKey, ruleKey),
        eq(schema.anomalyFindings.entityId, entityId),
        ne(schema.anomalyFindings.status, 'false_positive'),
        gt(schema.anomalyFindings.detectedAt, cutoff),
      )
    )
    .limit(1);
  return rows.length > 0;
}

/** آستانه‌های قانون از جدول anomaly_rules — null اگر rule غیرفعال باشد */
export async function getRuleThresholds(ruleKey: string): Promise<Record<string, number> | null> {
  const [rule] = await db
    .select({ enabled: schema.anomalyRules.enabled, thresholds: schema.anomalyRules.thresholds })
    .from(schema.anomalyRules)
    .where(eq(schema.anomalyRules.ruleKey, ruleKey))
    .limit(1);
  if (!rule || !rule.enabled) return null;
  return (rule.thresholds as Record<string, number>) ?? {};
}

/** ذخیره findings با dedup + اعلان داخلی برای high/medium */
export async function saveFindings(findings: AnomalyFindingInput[]): Promise<void> {
  for (const finding of findings) {
    if (await isDuplicate(finding.ruleKey, finding.entityId)) continue;

    const [row] = await db
      .insert(schema.anomalyFindings)
      .values({
        ruleKey: finding.ruleKey,
        severity: finding.severity,
        status: 'new',
        branchId: finding.branchId ?? null,
        entityType: finding.entityType ?? null,
        entityId: finding.entityId ?? null,
        jalaliDate: finding.jalaliDate ?? getTodayJalali(),
        detectedAt: new Date(),
        details: finding.details,
        note: finding.note,
      })
      .returning({ id: schema.anomalyFindings.id });

    if (!row) continue;

    if (finding.severity === 'high') {
      void notifyAdmins(
        {
          type: 'critical',
          title: `هشدار کارآگاه: ${finding.note}`,
          sub: `قانون: ${finding.ruleKey} · شناسه: ${finding.entityId ?? '—'}`,
          actionUrl: '/detective',
          entityId: row.id,
          ruleKey: finding.ruleKey,
        },
        undefined,
        { sms: true }
      ).catch(() => {});
    } else if (finding.severity === 'medium') {
      void notifyAdmins({
        type: 'warning',
        title: `هشدار کارآگاه: ${finding.note}`,
        sub: `قانون: ${finding.ruleKey} · شناسه: ${finding.entityId ?? '—'}`,
        actionUrl: '/detective',
        entityId: row.id,
        ruleKey: finding.ruleKey,
      }).catch(() => {});
    }
  }
}
