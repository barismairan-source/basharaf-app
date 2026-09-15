import { NextResponse } from 'next/server';
import { asc, eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { ApiError, handleError } from '@/lib/api-error';
import { rowToRecipe, rowToRecipeCategory, rowToRecipeIngredient } from '@/lib/db/recipeSerializers';

export const dynamic = 'force-dynamic';

/** GET /api/recipes/by-slug/[slug] — عمومی، فقط اگر published باشد. */
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  try {
    const [row] = await db.select().from(schema.recipes).where(eq(schema.recipes.slug, params.slug));
    if (!row || !row.isPublished) throw new ApiError(404, 'رسپی پیدا نشد', 'NOT_FOUND');

    const [category, ingredientRows] = await Promise.all([
      row.categoryId
        ? db.select().from(schema.recipeCategories).where(eq(schema.recipeCategories.id, row.categoryId)).then(r => r[0] ?? null)
        : Promise.resolve(null),
      db.select().from(schema.recipeIngredients).where(eq(schema.recipeIngredients.recipeId, row.id)).orderBy(asc(schema.recipeIngredients.sortOrder)),
    ]);

    const tagIds = ingredientRows.map(i => i.ingredientTagId);
    const tagRows = tagIds.length > 0
      ? await db.select().from(schema.ingredientTags).where(inArray(schema.ingredientTags.id, tagIds))
      : [];
    const tagNameById = new Map(tagRows.map(t => [t.id, t.name]));

    const ingredients = ingredientRows.map(r => rowToRecipeIngredient(r, tagNameById.get(r.ingredientTagId) ?? ''));
    const categoryDto = category ? rowToRecipeCategory(category) : null;

    return NextResponse.json({ recipe: rowToRecipe(row, categoryDto, ingredients) });
  } catch (e) {
    return handleError(e);
  }
}
