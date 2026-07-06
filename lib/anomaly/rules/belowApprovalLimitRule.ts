import { and, eq, gt, gte, lt, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { getRuleThresholds } from '../engine';
import type { AnomalyFindingInput } from '../types';

export interface BelowApprovalContext {
  txId: string;
  userId: string;
  amount: number;
  branchId: string | null;
  createdAt: Date;
}

export async function belowApprovalLimitRule(
  ctx: BelowApprovalContext
): Promise<AnomalyFindingInput[]> {
  const thresholds = await getRuleThresholds('below_approval_limit');
  if (!thresholds) return [];

  const maxCount = (thresholds.maxCount as number) ?? 3;
  const windowHours = (thresholds.windowHours as number) ?? 24;
  const rangeStartPct = (thresholds.rangeStartPct as number) ?? 80;

  // آستانه‌ی high_value_tx از notification_rules
  const [hvRule] = await db
    .select({
      threshold: schema.notificationRules.threshold,
      enabled: schema.notificationRules.enabled,
    })
    .from(schema.notificationRules)
    .where(eq(schema.notificationRules.key, 'high_value_tx'))
    .limit(1);

  if (!hvRule?.enabled || hvRule.threshold === null || hvRule.threshold === undefined) return [];
  const approvalThreshold = hvRule.threshold;

  const rangeMin = Math.round(approvalThreshold * (rangeStartPct / 100));

  // تراکنش باید در بازه‌ی مشکوک باشد: [rangeMin, approvalThreshold)
  if (ctx.amount < rangeMin || ctx.amount >= approvalThreshold) return [];

  const cutoff = new Date(ctx.createdAt.getTime() - windowHours * 60 * 60 * 1000);

  const [countRow] = await db
    .select({ count: sql<string>`COUNT(*)` })
    .from(schema.transactions)
    .where(
      and(
        eq(schema.transactions.createdBy, ctx.userId),
        gte(schema.transactions.amount, rangeMin),
        lt(schema.transactions.amount, approvalThreshold),
        gt(schema.transactions.createdAt, cutoff),
      )
    );

  const splitCount = parseInt(countRow?.count ?? '0');
  if (splitCount < maxCount) return [];

  return [
    {
      ruleKey: 'below_approval_limit',
      severity: 'high',
      branchId: ctx.branchId,
      entityType: 'transaction',
      entityId: ctx.txId,
      details: {
        txId: ctx.txId,
        amount: ctx.amount,
        approvalThreshold,
        rangeMin,
        splitCount,
        windowHours,
      },
      note: `تراکنش زیر سقف تأیید — ${splitCount} تراکنش مشابه در ${windowHours} ساعت`,
    },
  ];
}
