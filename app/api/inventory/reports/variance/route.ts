// GET /api/inventory/reports/variance?branchId=X&dateFrom=1403-01-01&dateTo=1403-01-31[&source=voucher|daily]
import { NextResponse } from 'next/server';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';
import { jalaliToDate } from '@/lib/jalali';

type SaleLine = { recipeId?: string; qty?: number; count?: number };

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const source = (searchParams.get('source') ?? 'voucher') as 'voucher' | 'daily';

    if (!branchId || !dateFrom || !dateTo) {
      return NextResponse.json({ error: 'پارامترهای ناقص' }, { status: 400 });
    }

    const ACTUAL_KINDS = ['out', 'waste', 'sale'] as const;

    // ── نمای فروش واقعی (inv_daily_sales + inv_stock_tx) ────────────────
    if (source === 'daily') {
      // ۱. واکشی فروش‌های روزانه در بازه
      const dailySales = await db
        .select()
        .from(schema.invDailySales)
        .where(
          and(
            eq(schema.invDailySales.branchId, branchId),
            sql`${schema.invDailySales.jalaliDate} >= ${dateFrom}`,
            sql`${schema.invDailySales.jalaliDate} <= ${dateTo}`,
          )
        );

      // ۲. جمع qty فروش به‌ازای هر recipeId (دو فرمت: qty یا count)
      const recipeQtyMap: Record<string, number> = {};
      for (const sale of dailySales) {
        const lines = sale.lines as SaleLine[];
        if (!Array.isArray(lines)) continue;
        for (const line of lines) {
          if (!line.recipeId) continue;
          const qty = (line.qty ?? line.count) ?? 0;
          recipeQtyMap[line.recipeId] = (recipeQtyMap[line.recipeId] ?? 0) + qty;
        }
      }
      const recipeIds = Object.keys(recipeQtyMap);

      // ۳. محاسبه‌ی تئوریک از خطوط رسپی
      const thMap: Record<string, number> = {};
      if (recipeIds.length > 0) {
        const recipes = await db
          .select({ id: schema.invRecipes.id, portions: schema.invRecipes.portions })
          .from(schema.invRecipes)
          .where(inArray(schema.invRecipes.id, recipeIds));
        const portionsMap: Record<string, number> = {};
        for (const r of recipes) portionsMap[r.id] = r.portions;

        const recipeLines = await db
          .select({
            recipeId: schema.invRecipeLines.recipeId,
            itemId: schema.invRecipeLines.itemId,
            qtyBase: schema.invRecipeLines.qtyBase,
            overridePct: schema.invRecipeLines.overridePct,
            yieldPct: schema.invItems.yieldPct,
          })
          .from(schema.invRecipeLines)
          .innerJoin(schema.invItems, eq(schema.invRecipeLines.itemId, schema.invItems.id))
          .where(inArray(schema.invRecipeLines.recipeId, recipeIds));

        for (const rl of recipeLines) {
          const portions = portionsMap[rl.recipeId] ?? 1;
          const saleQty = recipeQtyMap[rl.recipeId] ?? 0;
          if (saleQty === 0) continue;
          const qtyBase = parseFloat(rl.qtyBase as string) || 0;
          const overridePct = rl.overridePct != null ? parseFloat(rl.overridePct as string) : null;
          const yieldPct = rl.yieldPct != null ? parseFloat(rl.yieldPct as string) : null;
          const effectivePct = overridePct ?? yieldPct ?? 100;
          // مقدار ماده لازم = (تعداد فروش / پرس) × qty_base_هر_پرس × (100 / yield)
          const matQty = (saleQty / portions) * qtyBase * (100 / effectivePct);
          thMap[rl.itemId] = (thMap[rl.itemId] ?? 0) + matQty;
        }
      }

      // ۴. واقعی از inv_stock_tx (فیلتر شعبه via join به inv_items)
      const branchItems = await db
        .select({ id: schema.invItems.id })
        .from(schema.invItems)
        .where(eq(schema.invItems.branchId, branchId));
      const branchItemIds = branchItems.map((i) => i.id);

      const acMap: Record<string, number> = {};
      if (branchItemIds.length > 0) {
        const actualTx = await db
          .select({
            itemId: schema.invStockTx.itemId,
            total: sql<string>`sum(-${schema.invStockTx.deltaBase})`,
          })
          .from(schema.invStockTx)
          .where(
            and(
              inArray(schema.invStockTx.itemId, branchItemIds),
              inArray(schema.invStockTx.kind, [...ACTUAL_KINDS]),
              sql`${schema.invStockTx.jalaliDate} >= ${dateFrom}`,
              sql`${schema.invStockTx.jalaliDate} <= ${dateTo}`,
            )
          )
          .groupBy(schema.invStockTx.itemId);

        for (const tx of actualTx) {
          acMap[tx.itemId] = parseFloat(tx.total) || 0;
        }
      }

      // ۵. ترکیب و ساخت ردیف‌های خروجی
      const itemIds = [...new Set([...Object.keys(thMap), ...Object.keys(acMap)])];
      if (itemIds.length === 0) return NextResponse.json({ rows: [] });

      const items = await db
        .select()
        .from(schema.invItems)
        .where(inArray(schema.invItems.id, itemIds));

      const rows = items.map((item) => {
        const theoreticalQty = thMap[item.id] ?? 0;
        const actualQty = acMap[item.id] ?? 0;
        const varianceQty = actualQty - theoreticalQty;
        const avgCost = parseFloat(item.avgCostPerBase as string) || 0;
        const varianceCost = Math.round(varianceQty * avgCost);
        return {
          itemId: item.id,
          itemName: item.name,
          unit: item.unit,
          theoreticalQty,
          actualQty,
          varianceQty,
          varianceCost,
          avgCost,
        };
      });

      rows.sort((a, b) => Math.abs(b.varianceCost) - Math.abs(a.varianceCost));
      return NextResponse.json({ rows });
    }

    // ── نمای حواله (voucher) — رفتار قبلی دست‌نخورده ────────────────────
    const fromDate = jalaliToDate(dateFrom);
    const toDate = jalaliToDate(dateTo);
    if (!fromDate || !toDate) {
      return NextResponse.json({ error: 'تاریخ نامعتبر' }, { status: 400 });
    }
    toDate.setHours(23, 59, 59, 999);
    const from = fromDate.toISOString();
    const to = toDate.toISOString();

    const SALE_KINDS = ['sale'] as const;

    const baseWhere = and(
      eq(schema.invVouchers.branchId, branchId),
      eq(schema.invVouchers.status, 'approved'),
      sql`${schema.invVouchers.updatedAt} >= ${from}`,
      sql`${schema.invVouchers.updatedAt} <= ${to}`,
    );

    const theoretical = await db
      .select({
        itemId: schema.invVoucherLines.itemId,
        qty: sql<string>`sum(${schema.invVoucherLines.qtyBase})`,
      })
      .from(schema.invVoucherLines)
      .innerJoin(schema.invVouchers, eq(schema.invVoucherLines.voucherId, schema.invVouchers.id))
      .where(and(baseWhere, inArray(schema.invVouchers.kind, [...SALE_KINDS])))
      .groupBy(schema.invVoucherLines.itemId);

    const actual = await db
      .select({
        itemId: schema.invVoucherLines.itemId,
        qty: sql<string>`sum(${schema.invVoucherLines.qtyBase})`,
      })
      .from(schema.invVoucherLines)
      .innerJoin(schema.invVouchers, eq(schema.invVoucherLines.voucherId, schema.invVouchers.id))
      .where(and(baseWhere, inArray(schema.invVouchers.kind, [...ACTUAL_KINDS])))
      .groupBy(schema.invVoucherLines.itemId);

    const itemIds = [...new Set([...theoretical.map((x) => x.itemId), ...actual.map((x) => x.itemId)])];
    if (itemIds.length === 0) return NextResponse.json({ rows: [] });

    const items = await db.select().from(schema.invItems).where(inArray(schema.invItems.id, itemIds));

    const thMap: Record<string, number> = {};
    for (const x of theoretical) thMap[x.itemId] = parseFloat(x.qty) || 0;
    const acMap: Record<string, number> = {};
    for (const x of actual) acMap[x.itemId] = parseFloat(x.qty) || 0;

    const rows = items.map((item) => {
      const theoreticalQty = thMap[item.id] ?? 0;
      const actualQty = acMap[item.id] ?? 0;
      const varianceQty = actualQty - theoreticalQty;
      const avgCost = parseFloat(item.avgCostPerBase as string) || 0;
      const varianceCost = Math.round(varianceQty * avgCost);
      return {
        itemId: item.id,
        itemName: item.name,
        unit: item.unit,
        theoreticalQty,
        actualQty,
        varianceQty,
        varianceCost,
        avgCost,
      };
    });

    rows.sort((a, b) => Math.abs(b.varianceCost) - Math.abs(a.varianceCost));
    return NextResponse.json({ rows });
  } catch (e) {
    return handleError(e);
  }
}
