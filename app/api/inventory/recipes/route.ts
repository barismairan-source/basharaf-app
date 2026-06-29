import { NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession, requireRole } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { rowToInvRecipe } from '@/lib/db/inventory.serializers';
import { audit } from '@/lib/auth/audit';

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
  menuItemId: z.string().uuid().nullable().optional(),
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
    const session = await requireRole('SuperAdmin', 'Chef');
    const input = saveSchema.parse(await req.json());

    // برای audit: قیمت قبلی را قبل از تراکنش بگیر
    let oldPrice: number | null = null;
    if (input.id) {
      const [existing] = await db.select({ price: schema.invRecipes.price })
        .from(schema.invRecipes).where(eq(schema.invRecipes.id, input.id)).limit(1);
      oldPrice = existing != null ? Number(existing.price) : null;
    }

    const result = await db.transaction(async (dbTx) => {
      let recipeId = input.id ?? null;

      if (recipeId) {
        await dbTx.update(schema.invRecipes).set({
          name: input.name, branchId: input.branchId ?? null,
          portions: input.portions, targetFcPct: String(input.targetFcPct),
          price: input.price, cookMode: input.cookMode, shelfLifeDays: input.shelfLifeDays,
          menuItemId: input.menuItemId ?? null,
          updatedAt: new Date(),
        }).where(eq(schema.invRecipes.id, recipeId));
        await dbTx.delete(schema.invRecipeLines).where(eq(schema.invRecipeLines.recipeId, recipeId));
      } else {
        const [r] = await dbTx.insert(schema.invRecipes).values({
          name: input.name, branchId: input.branchId ?? null,
          portions: input.portions, targetFcPct: String(input.targetFcPct),
          price: input.price, cookMode: input.cookMode, shelfLifeDays: input.shelfLifeDays,
          menuItemId: input.menuItemId ?? null,
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

    // audit فقط برای تغییر قیمت در به‌روزرسانی
    if (input.id && oldPrice !== null && input.price !== oldPrice) {
      audit({
        action: 'inv.recipe.priceChanged',
        userId: session.sub,
        meta: { recipeId: result.id, oldPrice, newPrice: input.price, menuItemId: input.menuItemId ?? null },
      });
    }

    return NextResponse.json({ recipe: result }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
