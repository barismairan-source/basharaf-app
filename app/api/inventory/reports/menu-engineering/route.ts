// GET /api/inventory/reports/menu-engineering?branchId=X&dateFrom=1403-01-01&dateTo=1403-01-31
import { NextResponse } from 'next/server';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';
import { costRecipe, type CostingItem, type CostingLine } from '@/lib/inventory/costing';

type SaleLine = { recipeId?: string; qty?: number; count?: number };

export type MenuEngineItem = {
  recipeId: string;
  name: string;
  unitsSold: number;
  unitPrice: number;
  unitCost: number;
  unitMargin: number;
  popularity: 'high' | 'low';
  profitability: 'high' | 'low';
  quadrant: 'star' | 'plowhorse' | 'puzzle' | 'dog';
};

export async function GET(req: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    if (!branchId || !dateFrom || !dateTo) {
      return NextResponse.json({ error: 'پارامترهای ناقص' }, { status: 400 });
    }

    // ۱. فروش روزانه در بازه → جمع تعداد به‌ازای هر recipeId
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

    const soldMap: Record<string, number> = {};
    for (const sale of dailySales) {
      const lines = sale.lines as SaleLine[];
      if (!Array.isArray(lines)) continue;
      for (const line of lines) {
        if (!line.recipeId) continue;
        const qty = (line.qty ?? line.count) ?? 0;
        soldMap[line.recipeId] = (soldMap[line.recipeId] ?? 0) + qty;
      }
    }

    const recipeIds = Object.keys(soldMap);
    if (recipeIds.length < 3) {
      return NextResponse.json({ items: [], tooFew: true, count: recipeIds.length });
    }

    // ۲. واکشی رسپی‌ها
    const recipes = await db
      .select({
        id: schema.invRecipes.id,
        name: schema.invRecipes.name,
        portions: schema.invRecipes.portions,
        price: schema.invRecipes.price,
        menuItemId: schema.invRecipes.menuItemId,
      })
      .from(schema.invRecipes)
      .where(inArray(schema.invRecipes.id, recipeIds));

    // ۳. قیمت فروش: از menu_items اگر menuItemId دارد
    const menuItemIds = recipes.map((r) => r.menuItemId).filter(Boolean) as string[];
    const menuPriceMap: Record<string, number> = {};
    if (menuItemIds.length > 0) {
      const menuItems = await db
        .select({ id: schema.menuItems.id, price: schema.menuItems.price })
        .from(schema.menuItems)
        .where(inArray(schema.menuItems.id, menuItemIds));
      for (const mi of menuItems) {
        if (mi.price) menuPriceMap[mi.id] = Number(mi.price);
      }
    }

    // ۴. خطوط رسپی
    const recipeLines = await db
      .select({
        recipeId: schema.invRecipeLines.recipeId,
        itemId: schema.invRecipeLines.itemId,
        qtyBase: schema.invRecipeLines.qtyBase,
        overridePct: schema.invRecipeLines.overridePct,
      })
      .from(schema.invRecipeLines)
      .where(inArray(schema.invRecipeLines.recipeId, recipeIds));

    // ۵. واکشی قلم‌ها
    const itemIds = [...new Set(recipeLines.map((l) => l.itemId))];
    const itemsById: Record<string, CostingItem> = {};
    if (itemIds.length > 0) {
      const items = await db
        .select({
          id: schema.invItems.id,
          name: schema.invItems.name,
          unit: schema.invItems.unit,
          kind: schema.invItems.kind,
          avgCostPerBase: schema.invItems.avgCostPerBase,
          yieldPct: schema.invItems.yieldPct,
        })
        .from(schema.invItems)
        .where(inArray(schema.invItems.id, itemIds));
      for (const item of items) {
        itemsById[item.id] = {
          id: item.id,
          name: item.name,
          unit: item.unit,
          kind: item.kind as 'raw' | 'prep',
          avgCostPerBase: parseFloat(item.avgCostPerBase as unknown as string) || 0,
          yieldPct: parseFloat(item.yieldPct as unknown as string) || 100,
        };
      }
    }

    // ۶. ساخت لاین‌مپ برای هر رسپی
    const linesMap: Record<string, CostingLine[]> = {};
    for (const rl of recipeLines) {
      if (!linesMap[rl.recipeId]) linesMap[rl.recipeId] = [];
      linesMap[rl.recipeId]!.push({
        itemId: rl.itemId,
        qtyBase: parseFloat(rl.qtyBase as unknown as string) || 0,
        overridePct: rl.overridePct != null ? parseFloat(rl.overridePct as unknown as string) : null,
      });
    }

    // ۷. محاسبه‌ی هر آیتم
    const raw: Array<{
      recipeId: string; name: string; unitsSold: number;
      unitPrice: number; unitCost: number; unitMargin: number;
    }> = [];

    for (const recipe of recipes) {
      const unitsSold = soldMap[recipe.id] ?? 0;
      const unitPrice =
        recipe.menuItemId && menuPriceMap[recipe.menuItemId]
          ? menuPriceMap[recipe.menuItemId]!
          : Number(recipe.price);
      const lines = linesMap[recipe.id] ?? [];
      const costing = costRecipe(
        { portions: recipe.portions, price: unitPrice, targetFcPct: 30 },
        lines,
        itemsById,
      );
      const unitCost = costing.costPerPortion;
      const unitMargin = unitPrice - unitCost;
      raw.push({ recipeId: recipe.id, name: recipe.name, unitsSold, unitPrice, unitCost, unitMargin });
    }

    // ۸. میانگین‌ها و طبقه‌بندی ربع‌ماتریس
    const avgSold = raw.reduce((s, r) => s + r.unitsSold, 0) / raw.length;
    const avgMargin = raw.reduce((s, r) => s + r.unitMargin, 0) / raw.length;

    const items: MenuEngineItem[] = raw.map((r) => {
      const popularity: 'high' | 'low' = r.unitsSold >= avgSold ? 'high' : 'low';
      const profitability: 'high' | 'low' = r.unitMargin >= avgMargin ? 'high' : 'low';
      const quadrant =
        popularity === 'high' && profitability === 'high' ? 'star'
        : popularity === 'high' && profitability === 'low' ? 'plowhorse'
        : popularity === 'low'  && profitability === 'high' ? 'puzzle'
        : 'dog';
      return { ...r, popularity, profitability, quadrant };
    });

    items.sort((a, b) => b.unitsSold - a.unitsSold);
    return NextResponse.json({ items, tooFew: false, count: items.length, avgSold, avgMargin });
  } catch (e) {
    return handleError(e);
  }
}
