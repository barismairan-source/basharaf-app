import { NextResponse } from 'next/server';
import { eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { canDo } from '@/lib/auth/permissions';
import { ApiError, handleError } from '@/lib/api-error';
import { costRecipe, lineCost, type CostingItem, type CostingLine, type LineCost } from '@/lib/inventory/costing';

export const dynamic = 'force-dynamic';

type PrepRecipeLine = { itemId: string; qtyBase: number; overridePct?: number | null };

/** GET — costing کامل یک رسپی (بهای هر پرس، food cost%، قیمت پیشنهادی).
 *  برای آیتم‌های نیمه‌آماده، subLines حاوی مواد تشکیل‌دهنده‌ی آن نیمه‌آماده است. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    if (!canDo(session, 'inventory.viewCosts')) {
      throw new ApiError(403, 'شما اجازه‌ی مشاهده‌ی بهای تمام‌شده را ندارید', 'FORBIDDEN');
    }

    const [recipe] = await db.select().from(schema.invRecipes)
      .where(eq(schema.invRecipes.id, params.id)).limit(1);
    if (!recipe) throw new ApiError(404, 'رسپی پیدا نشد', 'NOT_FOUND');

    // قیمت آیتم منوی لینک‌شده (برای نمایش اختلاف قیمت)
    let menuPrice: number | null = null;
    let menuPriceTakeaway: number | null = null;
    if (recipe.menuItemId) {
      const [mi] = await db.select({
        price: schema.menuItems.price,
        priceTakeaway: schema.menuItems.priceTakeaway,
      }).from(schema.menuItems).where(eq(schema.menuItems.id, recipe.menuItemId)).limit(1);
      menuPrice = mi?.price ?? null;
      menuPriceTakeaway = mi?.priceTakeaway ?? null;
    }

    const lineRows = await db.select().from(schema.invRecipeLines)
      .where(eq(schema.invRecipeLines.recipeId, params.id));

    const topItemIds = [...new Set(lineRows.map((l) => l.itemId))];
    const topItemRows = topItemIds.length
      ? await db.select().from(schema.invItems).where(inArray(schema.invItems.id, topItemIds))
      : [];

    // ساخت map برای costing اصلی
    const itemsById: Record<string, CostingItem> = {};
    for (const it of topItemRows) {
      itemsById[it.id] = {
        id: it.id, name: it.name, unit: it.unit, kind: it.kind,
        avgCostPerBase: Number(it.avgCostPerBase),
        yieldPct: Number(it.yieldPct),
      };
    }

    const costingLines: CostingLine[] = lineRows.map((l) => ({
      itemId: l.itemId,
      qtyBase: Number(l.qtyBase),
      overridePct: l.overridePct == null ? null : Number(l.overridePct),
    }));

    const costing = costRecipe(
      { portions: recipe.portions, price: Number(recipe.price), targetFcPct: Number(recipe.targetFcPct) },
      costingLines, itemsById
    );

    // ── Expand sub-lines برای آیتم‌های نیمه‌آماده ──────────────────────
    // جمع‌آوری itemId‌های زیرمجموعه‌ی همه‌ی prepها (که هنوز fetch نشده‌اند)
    const prepRows = topItemRows.filter(it => it.kind === 'prep' && it.prepRecipe);
    const subItemIdSet = new Set<string>();
    for (const prep of prepRows) {
      const pr = prep.prepRecipe as PrepRecipeLine[] | null;
      if (pr) for (const sub of pr) subItemIdSet.add(sub.itemId);
    }
    // حذف itemIdهایی که قبلاً fetch شده‌اند
    const missingSubIds = [...subItemIdSet].filter(id => !itemsById[id]);
    const subItemRows = missingSubIds.length
      ? await db.select().from(schema.invItems).where(inArray(schema.invItems.id, missingSubIds))
      : [];

    // map واحد شامل همه‌ی items (top + sub)
    const allItemsById: Record<string, CostingItem> = { ...itemsById };
    for (const it of subItemRows) {
      allItemsById[it.id] = {
        id: it.id, name: it.name, unit: it.unit, kind: it.kind,
        avgCostPerBase: Number(it.avgCostPerBase),
        yieldPct: Number(it.yieldPct),
      };
    }

    // ساخت map از itemId → prepRecipe و batchYieldBase برای دسترسی سریع
    const prepMeta: Record<string, { recipe: PrepRecipeLine[]; batchYieldBase: number }> = {};
    for (const it of prepRows) {
      const pr = it.prepRecipe as PrepRecipeLine[] | null;
      if (pr && pr.length > 0) {
        prepMeta[it.id] = {
          recipe: pr,
          batchYieldBase: Number(it.batchYieldBase) || 0,
        };
      }
    }

    // غنی‌سازی costing.lines با subLines برای prepها
    const enrichedLines: LineCost[] = costing.lines.map(l => {
      const meta = prepMeta[l.itemId];
      if (!meta || meta.batchYieldBase <= 0) return l;

      // چند batch از این prep در رسپی استفاده شده؟
      const recipeLine = costingLines.find(cl => cl.itemId === l.itemId);
      const qtyUsed = recipeLine?.qtyBase ?? l.qtyBase;
      const scaleFactor = qtyUsed / meta.batchYieldBase;

      const subLines: LineCost[] = meta.recipe.map(sub => {
        const subItem = allItemsById[sub.itemId];
        const scaledLine: CostingLine = {
          itemId: sub.itemId,
          qtyBase: sub.qtyBase * scaleFactor,
          overridePct: sub.overridePct ?? null,
        };
        return lineCost(subItem, scaledLine);
      });

      return { ...l, subLines };
    });

    return NextResponse.json({ costing: { ...costing, lines: enrichedLines, menuPrice, menuPriceTakeaway } });
  } catch (e) {
    return handleError(e);
  }
}
