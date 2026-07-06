import { and, eq, gt, isNotNull, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { getRuleThresholds } from '../engine';
import { isWasteSpike } from '../utils';
import type { AnomalyFindingInput } from '../types';

export interface WasteSpikeContext {
  voucherId: string;
  branchId: string | null;
  finalTotal: number;
  makerDate: string;
}

export async function wasteSpikeRule(ctx: WasteSpikeContext): Promise<AnomalyFindingInput[]> {
  if (!ctx.branchId || ctx.finalTotal <= 0) return [];

  const thresholds = await getRuleThresholds('waste_spike');
  if (!thresholds) return [];
  const multiplierPct = (thresholds.multiplierPct as number) ?? 200;

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [row] = await db
    .select({ avg: sql<string>`AVG(${schema.invVouchers.finalTotal})` })
    .from(schema.invVouchers)
    .where(
      and(
        eq(schema.invVouchers.kind, 'waste'),
        eq(schema.invVouchers.status, 'approved'),
        eq(schema.invVouchers.branchId, ctx.branchId),
        gt(schema.invVouchers.approvedAt, cutoff),
        isNotNull(schema.invVouchers.finalTotal),
      )
    );

  const avg30d = parseFloat(row?.avg ?? '0');
  if (!isWasteSpike(ctx.finalTotal, avg30d, multiplierPct)) return [];

  const multiplier = Math.round((ctx.finalTotal / avg30d) * 10) / 10;

  return [
    {
      ruleKey: 'waste_spike',
      severity: 'high',
      branchId: ctx.branchId,
      entityType: 'voucher',
      entityId: ctx.voucherId,
      details: {
        todayTotal: ctx.finalTotal,
        avg30d: Math.round(avg30d),
        multiplier,
        threshold: multiplierPct,
      },
      note: `جهش ضایعات — ${multiplier}× میانگین ۳۰ روزه`,
      jalaliDate: ctx.makerDate,
    },
  ];
}
