import { NextResponse } from 'next/server';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

const ingredientSchema = z.object({
  ingredientTagId: z.string().uuid(),
  quantityLabel: z.string().max(80).optional().default(''),
  sortOrder: z.number().int().optional().default(0),
});

const patchSchema = z.object({
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/, 'فقط حروف کوچک انگلیسی، عدد و خط تیره').optional(),
  title: z.string().min(1).max(160).optional(),
  summary: z.string().max(600).optional(),
  categoryId: z.string().uuid().nullable().optional(),
  protein: z.enum(['chicken', 'red_meat', 'seafood', 'vegetarian', 'vegan', 'other']).optional(),
  prepTimeMinutes: z.number().int().min(0).max(1440).nullable().optional(),
  servings: z.string().max(40).nullable().optional(),
  steps: z.array(z.string().min(1)).optional(),
  instagramUrl: z.string().max(500).nullable().optional(),
  videoUrl: z.string().max(500).nullable().optional(),
  imageUrl: z.string().max(500).nullable().optional(),
  isPublished: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  // اگر بیاید، کل لیست مواد اولیه‌ی این رسپی جایگزین می‌شود.
  ingredients: z.array(ingredientSchema).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const input = patchSchema.parse(await req.json());
    const { ingredients, ...recipePatch } = input;

    if (ingredients && ingredients.length > 0) {
      const tagIds = ingredients.map(i => i.ingredientTagId);
      const found = await db.select({ id: schema.ingredientTags.id }).from(schema.ingredientTags).where(inArray(schema.ingredientTags.id, tagIds));
      if (found.length !== new Set(tagIds).size) throw new ApiError(400, 'یکی از مواد اولیه پیدا نشد', 'INGREDIENT_NOT_FOUND');
    }

    const row = await db.transaction(async (tx) => {
      const [updated] = Object.keys(recipePatch).length > 0
        ? await tx.update(schema.recipes).set({ ...recipePatch, updatedAt: new Date() }).where(eq(schema.recipes.id, params.id)).returning()
        : await tx.select().from(schema.recipes).where(eq(schema.recipes.id, params.id));
      if (!updated) throw new ApiError(404, 'رسپی پیدا نشد', 'NOT_FOUND');

      if (ingredients) {
        await tx.delete(schema.recipeIngredients).where(eq(schema.recipeIngredients.recipeId, params.id));
        if (ingredients.length > 0) {
          await tx.insert(schema.recipeIngredients).values(
            ingredients.map(i => ({ recipeId: params.id, ingredientTagId: i.ingredientTagId, quantityLabel: i.quantityLabel, sortOrder: i.sortOrder })),
          );
        }
      }
      return updated;
    });

    return NextResponse.json({ recipe: row });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    await db.delete(schema.recipes).where(eq(schema.recipes.id, params.id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
