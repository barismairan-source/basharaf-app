import { NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession, requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { rowToInvRecipe } from '@/lib/db/inventory.serializers';

/**
 * /api/inventory/recipes
 *   GET  — لیست رسپی‌ها همراه با خطوط (مواد)
 *   POST — ساخت/به‌روزرسانی رسپی (با خطوطش، اتمیک)
 */

const lineSchema = z.object({
  itemId: z.string().uuid(),
  qtyBase: z.number().positive(),
  overridePct: z.number().nullable().optional(),
});

const saveSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(120),
  branchId: z.string().uuid().nullable().optional(),
  portions: z.number().int().min(1).default(1),
  targetFcPct: z.number().min(0).max(100).default(30),
  price: z.number().int().min(0).default(0),
  cookMode: z.enum(['daily', 'batch']).default('daily'),
  shelfLifeDays: z.number().int().min(0).default(1),
  lines: z.array(lineSchema).min(1, 'حداقل یک ماده لازم است'),
});

export async function GET() {
  try {
    await requireSession();
    const recipes = await db.select().from(schema.invRecipes)
      .where(eq(schema.invRecipes.isActive, true))
      .orderBy(desc(schema.invRecipes.createdAt));
    const allLines = await db.select().from(schema.invRecipeLines);
    const result = recipes.map(r =>
      rowToInvRecipe(r, allLines.filter(l => l.recipeId === r.id))
    );
    return NextResponse.json({ recipes: result });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const input = saveSchema.parse(await req.json());

    const result = await db.transaction(async (dbTx) => {
      let recipeId = input.id ?? null;

      if (recipeId) {
        // به‌روزرسانی
        await dbTx.update(schema.invRecipes).set({
          name: input.name, branchId: input.branchId ?? null,
          portions: input.portions, targetFcPct: String(input.targetFcPct),
          price: input.price, cookMode: input.cookMode, shelfLifeDays: input.shelfLifeDays,
          updatedAt: new Date(),
        }).where(eq(schema.invRecipes.id, recipeId));
        // خطوط قدیمی را پاک و دوباره بساز
        await dbTx.delete(schema.invRecipeLines).where(eq(schema.invRecipeLines.recipeId, recipeId));
      } else {
        const [r] = await dbTx.insert(schema.invRecipes).values({
          name: input.name, branchId: input.branchId ?? null,
          portions: input.portions, targetFcPct: String(input.targetFcPct),
          price: input.price, cookMode: input.cookMode, shelfLifeDays: input.shelfLifeDays,
        }).returning();
        if (!r) throw new ApiError(500, 'خطا در ساخت رسپی', 'INSERT_FAILED');
        recipeId = r.id;
      }

      for (const l of input.lines) {
        await dbTx.insert(schema.invRecipeLines).values({
          recipeId: recipeId!, itemId: l.itemId,
          qtyBase: String(l.qtyBase),
          overridePct: l.overridePct != null ? String(l.overridePct) : null,
        });
      }

      const [row] = await dbTx.select().from(schema.invRecipes).where(eq(schema.invRecipes.id, recipeId!)).limit(1);
      const lines = await dbTx.select().from(schema.invRecipeLines).where(eq(schema.invRecipeLines.recipeId, recipeId!));
      if (!row) throw new ApiError(500, 'خطا', 'FETCH_FAILED');
      return rowToInvRecipe(row, lines);
    });

    return NextResponse.json({ recipe: result }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
