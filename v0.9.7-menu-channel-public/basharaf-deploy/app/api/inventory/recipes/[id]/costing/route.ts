import { NextResponse } from 'next/server';
import { eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { canDo } from '@/lib/auth/permissions';
import { ApiError, handleError } from '@/lib/api-error';
import { costRecipe, type CostingItem, type CostingLine } from '@/lib/inventory/costing';

export const dynamic = 'force-dynamic';

/** GET — costing کامل یک رسپی (بهای هر پرس، food cost%، قیمت پیشنهادی). */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    // costing کاملاً مالی است — تفکیک وظایف: انباردار/بدون مجوز مالی دسترسی ندارد
    if (!canDo(session, 'inventory.viewCosts')) {
      throw new ApiError(403, 'شما اجازه‌ی مشاهده‌ی بهای تمام‌شده را ندارید', 'FORBIDDEN');
    }
    const [recipe] = await db.select().from(schema.invRecipes)
      .where(eq(schema.invRecipes.id, params.id)).limit(1);
    if (!recipe) throw new ApiError(404, 'رسپی پیدا نشد', 'NOT_FOUND');

    const lineRows = await db.select().from(schema.invRecipeLines)
      .where(eq(schema.invRecipeLines.recipeId, params.id));
    const itemIds = [...new Set(lineRows.map((l) => l.itemId))];
    const itemRows = itemIds.length
      ? await db.select().from(schema.invItems).where(inArray(schema.invItems.id, itemIds))
      : [];

    const itemsById: Record<string, CostingItem> = {};
    for (const it of itemRows) {
      itemsById[it.id] = {
        id: it.id, name: it.name, unit: it.unit, kind: it.kind,
        avgCostPerBase: Number(it.avgCostPerBase),
        yieldPct: Number(it.yieldPct),
      };
    }
    const lines: CostingLine[] = lineRows.map((l) => ({
      itemId: l.itemId,
      qtyBase: Number(l.qtyBase),
      overridePct: l.overridePct == null ? null : Number(l.overridePct),
    }));

    const costing = costRecipe(
      { portions: recipe.portions, price: Number(recipe.price), targetFcPct: Number(recipe.targetFcPct) },
      lines, itemsById
    );
    return NextResponse.json({ costing });
  } catch (e) {
    return handleError(e);
  }
}
