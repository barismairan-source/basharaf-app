import { and, eq, gt, inArray, lt, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { getRuleThresholds } from '../engine';
import { isConsumptionSpike } from '../utils';
import type { AnomalyFindingInput } from '../types';

// kind column is a pgEnum — use SQL expression for kind filter
const consumptionKindFilter = sql`${schema.invStockTx.kind} IN ('out', 'waste', 'sale')`;

export async function consumptionSpikeRule(): Promise<AnomalyFindingInput[]> {
  const thresholds = await getRuleThresholds('consumption_spike');
  if (!thresholds) return [];
  const multiplierPct = (thresholds.multiplierPct as number) ?? 250;

  // بازه‌ی UTC — برای شروع امروز و هفت روز قبل
  const now = new Date();
  const todayStartMs = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );
  const todayStart = new Date(todayStartMs);
  const weekStart = new Date(todayStartMs - 7 * 24 * 60 * 60 * 1000);

  // مصرف امروز per item+branch
  const todayRows = await db
    .select({
      itemId: schema.invStockTx.itemId,
      branchId: schema.invVouchers.branchId,
      total: sql<string>`-SUM(${schema.invStockTx.deltaBase}::numeric)`,
    })
    .from(schema.invStockTx)
    .innerJoin(schema.invVouchers, eq(schema.invStockTx.voucherId, schema.invVouchers.id))
    .where(
      and(
        consumptionKindFilter,
        gt(schema.invStockTx.createdAt, todayStart),
        sql`${schema.invStockTx.deltaBase}::numeric < 0`,
      )
    )
    .groupBy(schema.invStockTx.itemId, schema.invVouchers.branchId);

  if (todayRows.length === 0) return [];

  // میانگین مصرف ۷ روز گذشته per item+branch
  const weekRows = await db
    .select({
      itemId: schema.invStockTx.itemId,
      branchId: schema.invVouchers.branchId,
      avg: sql<string>`-SUM(${schema.invStockTx.deltaBase}::numeric) / 7.0`,
    })
    .from(schema.invStockTx)
    .innerJoin(schema.invVouchers, eq(schema.invStockTx.voucherId, schema.invVouchers.id))
    .where(
      and(
        consumptionKindFilter,
        gt(schema.invStockTx.createdAt, weekStart),
        lt(schema.invStockTx.createdAt, todayStart),
        sql`${schema.invStockTx.deltaBase}::numeric < 0`,
      )
    )
    .groupBy(schema.invStockTx.itemId, schema.invVouchers.branchId);

  const avgMap = new Map<string, number>();
  for (const r of weekRows) {
    if (r.branchId) {
      avgMap.set(`${r.itemId}|${r.branchId}`, parseFloat(r.avg ?? '0'));
    }
  }

  // نام‌های اقلام
  const itemIds = [...new Set(todayRows.map((r) => r.itemId))];
  const itemNames =
    itemIds.length > 0
      ? await db
          .select({ id: schema.invItems.id, name: schema.invItems.name })
          .from(schema.invItems)
          .where(inArray(schema.invItems.id, itemIds))
      : [];
  const nameMap = new Map(itemNames.map((i) => [i.id, i.name]));

  const findings: AnomalyFindingInput[] = [];

  for (const row of todayRows) {
    const todayConsumption = parseFloat(row.total ?? '0');
    const avg7d = avgMap.get(`${row.itemId}|${row.branchId}`) ?? 0;
    if (!isConsumptionSpike(todayConsumption, avg7d, multiplierPct)) continue;

    const spikePct = Math.round((todayConsumption / avg7d - 1) * 100);

    findings.push({
      ruleKey: 'consumption_spike',
      severity: 'medium',
      branchId: row.branchId ?? null,
      entityType: 'item',
      entityId: row.itemId,
      details: {
        itemId: row.itemId,
        itemName: nameMap.get(row.itemId) ?? row.itemId,
        todayConsumption: Math.round(todayConsumption * 100) / 100,
        avg7d: Math.round(avg7d * 100) / 100,
        spikePct,
        threshold: multiplierPct,
      },
      note: `جهش مصرف — ${nameMap.get(row.itemId) ?? row.itemId} — ${spikePct}% بیشتر از میانگین`,
    });
  }

  return findings;
}
