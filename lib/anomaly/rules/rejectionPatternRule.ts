import { and, eq, gt, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { getRuleThresholds } from '../engine';
import type { AnomalyFindingInput } from '../types';

export interface RejectionContext {
  createdBy: string | null;
  branchId: string | null;
}

export async function rejectionPatternRule(ctx: RejectionContext): Promise<AnomalyFindingInput[]> {
  if (!ctx.createdBy) return [];

  const thresholds = await getRuleThresholds('rejection_pattern');
  if (!thresholds) return [];
  const maxRejects = (thresholds.maxRejects as number) ?? 3;
  const windowDays = (thresholds.windowDays as number) ?? 3;

  const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const [txRow] = await db
    .select({ count: sql<string>`COUNT(*)` })
    .from(schema.transactions)
    .where(
      and(
        eq(schema.transactions.status, 'rejected'),
        eq(schema.transactions.createdBy, ctx.createdBy),
        gt(schema.transactions.rejectedAt, cutoff),
      )
    );

  const [vRow] = await db
    .select({ count: sql<string>`COUNT(*)` })
    .from(schema.invVouchers)
    .where(
      and(
        eq(schema.invVouchers.status, 'rejected'),
        eq(schema.invVouchers.createdBy, ctx.createdBy),
        gt(schema.invVouchers.rejectedAt, cutoff),
      )
    );

  const totalCount =
    parseInt(txRow?.count ?? '0') + parseInt(vRow?.count ?? '0');

  if (totalCount < maxRejects) return [];

  // نام کاربر
  const [user] = await db
    .select({ name: schema.users.name })
    .from(schema.users)
    .where(eq(schema.users.id, ctx.createdBy))
    .limit(1);

  return [
    {
      ruleKey: 'rejection_pattern',
      severity: 'medium',
      branchId: ctx.branchId,
      entityType: 'user',
      entityId: ctx.createdBy,
      details: {
        userId: ctx.createdBy,
        userName: user?.name ?? ctx.createdBy,
        rejectCount: totalCount,
        windowDays,
        threshold: maxRejects,
      },
      note: `الگوی رد مکرر — ${user?.name ?? ctx.createdBy} — ${totalCount} رد در ${windowDays} روز`,
    },
  ];
}
