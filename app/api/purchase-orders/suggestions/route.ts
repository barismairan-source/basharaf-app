import { NextResponse } from 'next/server';
import { and, eq, sql, inArray, gte } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { computeSuggestion } from '@/lib/inventory/purchaseSuggestion';

/** وضعیت‌هایی که واقعاً از انبار خارج می‌کنند — همان قرارداد گزارش انحراف (variance). */
const CONSUMPTION_KINDS = ['out', 'waste', 'sale'] as const;

/** پنجره‌ی نگاه به گذشته برای محاسبه‌ی میانگین مصرف روزانه — یک عدد ثابت برای همه‌ی اقلام، ساده و پایدار. */
const LOOKBACK_DAYS = 28;

/**
 * GET /api/purchase-orders/suggestions?branchId=X
 *   پیشنهاد سفارش خرید برای اقلام «زیر حداقل موجودی» یک شعبه.
 *
 *   مقدار پیشنهادی دو سیگنال را با هم می‌بیند و بیشترین را انتخاب می‌کند:
 *   ۱) کمبود تا حداقل موجودی (رفتار قبلی — همیشه حداقل همین را پیشنهاد می‌دهد)
 *   ۲) بر اساس ریتم واقعی مصرف اخیر (miانگین مصرف روزانه‌ی ۲۸ روز گذشته از
 *      دفتر کل انبار inv_stock_tx) × بازه‌ی پوشش تا چرخه‌ی بعدی شمارش
 *      (روزانه: ~۲ روز، هفتگی: ~۸ روز) — یعنی برای اقلامی که سریع مصرف
 *      می‌شوند، فقط رساندن به حداقل کافی نیست.
 *   اگر تاریخچه‌ی مصرف نباشد (قلم جدید)، سیگنال ۲ صفر می‌شود و بی‌صدا به
 *   همان رفتار قبلی (سیگنال ۱) برمی‌گردد.
 */
export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    if (!branchId) throw new ApiError(400, 'شعبه الزامی است', 'BRANCH_REQUIRED');
    if (session.role !== 'SuperAdmin' && session.branchId !== branchId) {
      throw new ApiError(403, 'شما فقط می‌توانید پیشنهاد سفارش شعبه‌ی خود را ببینید', 'BRANCH_MISMATCH');
    }

    const rows = await db.select({
      id: schema.invItems.id,
      name: schema.invItems.name,
      unit: schema.invItems.unit,
      basePerUnit: schema.invItems.basePerUnit,
      qtyPhysical: schema.invItems.qtyPhysical,
      minBase: schema.invItems.minBase,
      countCycle: schema.invItems.countCycle,
      avgCostPerBase: schema.invItems.avgCostPerBase,
    })
      .from(schema.invItems)
      .where(and(
        eq(schema.invItems.branchId, branchId),
        eq(schema.invItems.isActive, true),
        sql`${schema.invItems.minBase} > 0`,
        sql`${schema.invItems.qtyPhysical} < ${schema.invItems.minBase}`,
      ));

    const itemIds = rows.map((r) => r.id);
    const consumedByItem = new Map<string, number>();
    if (itemIds.length > 0) {
      const cutoff = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
      const consumption = await db
        .select({
          itemId: schema.invStockTx.itemId,
          total: sql<string>`sum(-${schema.invStockTx.deltaBase})`,
        })
        .from(schema.invStockTx)
        .where(and(
          inArray(schema.invStockTx.itemId, itemIds),
          inArray(schema.invStockTx.kind, [...CONSUMPTION_KINDS]),
          gte(schema.invStockTx.createdAt, cutoff),
        ))
        .groupBy(schema.invStockTx.itemId);
      for (const c of consumption) consumedByItem.set(c.itemId, parseFloat(c.total) || 0);
    }

    const items = rows.map((r) => {
      const basePerUnit = parseFloat(r.basePerUnit) || 1;
      const qtyPhysical = parseFloat(r.qtyPhysical) || 0;
      const minBase = parseFloat(r.minBase) || 0;
      const avgCostPerBase = parseFloat(r.avgCostPerBase) || 0;
      const totalConsumedBase = consumedByItem.get(r.id) ?? 0;

      const { suggestedBase, avgDailyConsumption, demandDriven } = computeSuggestion({
        qtyPhysical, minBase, countCycle: r.countCycle, totalConsumedBase, lookbackDays: LOOKBACK_DAYS,
      });

      return {
        id: r.id,
        name: r.name,
        unit: r.unit,
        countCycle: r.countCycle,
        currentQty: Math.round((qtyPhysical / basePerUnit) * 100) / 100,
        minQty: Math.round((minBase / basePerUnit) * 100) / 100,
        suggestedQty: Math.max(1, Math.ceil(suggestedBase / basePerUnit)),
        suggestedUnitCost: Math.round(avgCostPerBase * basePerUnit),
        avgDailyConsumptionQty: Math.round((avgDailyConsumption / basePerUnit) * 100) / 100,
        demandDriven,
      };
    });

    return NextResponse.json({ items });
  } catch (e) {
    return handleError(e);
  }
}
