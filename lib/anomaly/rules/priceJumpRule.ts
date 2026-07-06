import { and, eq, gt, inArray, ne, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { getRuleThresholds } from '../engine';
import { isPriceJump } from '../utils';
import type { AnomalyFindingInput } from '../types';

export interface PriceJumpLine {
  itemId: string;
  finalUnitCost: number;
}

export interface PriceJumpContext {
  voucherId: string;
  branchId: string | null;
  lines: PriceJumpLine[];
  makerDate: string;
}

export async function priceJumpRule(ctx: PriceJumpContext): Promise<AnomalyFindingInput[]> {
  if (!ctx.branchId || ctx.lines.length === 0) return [];

  const thresholds = await getRuleThresholds('price_jump');
  if (!thresholds) return [];
  const jumpPct = (thresholds.jumpPct as number) ?? 30;

  const itemIds = ctx.lines.map((l) => l.itemId);
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  // میانگین قیمت واحد نهایی هر قلم در ۹۰ روز گذشته (بدون برگه‌ی جاری)
  const avgRows = await db
    .select({
      itemId: schema.invVoucherLines.itemId,
      avg: sql<string>`AVG(NULLIF(${schema.invVoucherLines.finalUnitCost}::numeric, 0))`,
    })
    .from(schema.invVoucherLines)
    .innerJoin(schema.invVouchers, eq(schema.invVoucherLines.voucherId, schema.invVouchers.id))
    .where(
      and(
        eq(schema.invVouchers.kind, 'in'),
        eq(schema.invVouchers.status, 'approved'),
        ne(schema.invVouchers.id, ctx.voucherId),
        inArray(schema.invVoucherLines.itemId, itemIds),
        gt(schema.invVouchers.approvedAt, cutoff),
      )
    )
    .groupBy(schema.invVoucherLines.itemId);

  const avgMap = new Map<string, number>();
  for (const r of avgRows) {
    avgMap.set(r.itemId, parseFloat(r.avg ?? '0'));
  }

  // نام‌های اقلام
  const itemNames = await db
    .select({ id: schema.invItems.id, name: schema.invItems.name })
    .from(schema.invItems)
    .where(inArray(schema.invItems.id, itemIds));
  const nameMap = new Map(itemNames.map((i) => [i.id, i.name]));

  const findings: AnomalyFindingInput[] = [];

  for (const line of ctx.lines) {
    if (line.finalUnitCost <= 0) continue;
    const avg90d = avgMap.get(line.itemId) ?? 0;
    if (!isPriceJump(line.finalUnitCost, avg90d, jumpPct)) continue;

    const jumpActual = Math.round(((line.finalUnitCost - avg90d) / avg90d) * 100);

    findings.push({
      ruleKey: 'price_jump',
      severity: 'high',
      branchId: ctx.branchId,
      entityType: 'voucher',
      entityId: `${ctx.voucherId}:${line.itemId}`,
      details: {
        itemId: line.itemId,
        itemName: nameMap.get(line.itemId) ?? line.itemId,
        newPrice: line.finalUnitCost,
        avg90d: Math.round(avg90d),
        jumpPct: jumpActual,
        threshold: jumpPct,
      },
      note: `جهش قیمت خرید — ${nameMap.get(line.itemId) ?? line.itemId} — ${jumpActual}% افزایش`,
      jalaliDate: ctx.makerDate,
    });
  }

  return findings;
}
