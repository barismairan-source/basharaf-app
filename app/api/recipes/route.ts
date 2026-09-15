import { NextResponse } from 'next/server';
import { asc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { rowToRecipe, rowToRecipeCategory, rowToRecipeIngredient } from '@/lib/db/recipeSerializers';

export const dynamic = 'force-dynamic';

const ingredientSchema = z.object({
  ingredientTagId: z.string().uuid(),
  quantityLabel: z.string().max(80).optional().default(''),
  sortOrder: z.number().int().optional().default(0),
});

const createSchema = z.object({
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/, 'فقط حروف کوچک انگلیسی، عدد و خط تیره'),
  title: z.string().min(1).max(160),
  summary: z.string().max(600).optional().default(''),
  categoryId: z.string().uuid().nullable().optional(),
  protein: z.enum(['chicken', 'red_meat', 'seafood', 'vegetarian', 'vegan', 'other']).optional().default('other'),
  prepTimeMinutes: z.number().int().min(0).max(1440).nullable().optional(),
  servings: z.string().max(40).nullable().optional(),
  steps: z.array(z.string().min(1)).optional().default([]),
  instagramUrl: z.string().max(500).nullable().optional(),
  videoUrl: z.string().max(500).nullable().optional(),
  imageUrl: z.string().max(500).nullable().optional(),
  isPublished: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
  ingredients: z.array(ingredientSchema).optional().default([]),
});

/**
 * GET /api/recipes — عمومی: فقط رسپی‌های published، با فیلتر اختیاری
 * ?category=<slug> ، ?protein=<enum> ، ?ingredients=<tagId1,tagId2,...>
 * (رسپی‌هایی که حداقل یکی از تگ‌ها را دارند، مرتب‌شده بر اساس بیشترین تطابق).
 * ?all=1 — همه‌ی رسپی‌ها اعم از پیش‌نویس؛ فقط ادمین (پنل مدیریت).
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const all = url.searchParams.get('all') === '1';
    if (all) await requireAdmin();

    const categorySlug = url.searchParams.get('category');
    const protein = url.searchParams.get('protein');
    const ingredientIds = (url.searchParams.get('ingredients') ?? '').split(',').filter(Boolean);

    const [recipeRows, categoryRows, tagRows, ingredientRows] = await Promise.all([
      db.select().from(schema.recipes).orderBy(asc(schema.recipes.sortOrder)),
      db.select().from(schema.recipeCategories).orderBy(asc(schema.recipeCategories.sortOrder)),
      db.select().from(schema.ingredientTags),
      db.select().from(schema.recipeIngredients).orderBy(asc(schema.recipeIngredients.sortOrder)),
    ]);

    const categoryById = new Map(categoryRows.map(c => [c.id, rowToRecipeCategory(c)]));
    const tagNameById = new Map(tagRows.map(t => [t.id, t.name]));
    const ingredientsByRecipe = new Map<string, ReturnType<typeof rowToRecipeIngredient>[]>();
    for (const row of ingredientRows) {
      const list = ingredientsByRecipe.get(row.recipeId) ?? [];
      list.push(rowToRecipeIngredient(row, tagNameById.get(row.ingredientTagId) ?? ''));
      ingredientsByRecipe.set(row.recipeId, list);
    }

    let items = recipeRows
      .filter(r => all || r.isPublished)
      .map(r => rowToRecipe(r, r.categoryId ? categoryById.get(r.categoryId) ?? null : null, ingredientsByRecipe.get(r.id) ?? []));

    if (categorySlug) items = items.filter(r => r.category?.slug === categorySlug);
    if (protein) items = items.filter(r => r.protein === protein);

    if (ingredientIds.length > 0) {
      const wanted = new Set(ingredientIds);
      items = items
        .map(r => ({ recipe: r, matchCount: r.ingredients.filter(i => wanted.has(i.ingredientTagId)).length }))
        .filter(x => x.matchCount > 0)
        .sort((a, b) => b.matchCount - a.matchCount)
        .map(x => x.recipe);
    }

    return NextResponse.json({ recipes: items });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const input = createSchema.parse(await req.json());

    if (input.ingredients.length > 0) {
      const tagIds = input.ingredients.map(i => i.ingredientTagId);
      const found = await db.select({ id: schema.ingredientTags.id }).from(schema.ingredientTags).where(inArray(schema.ingredientTags.id, tagIds));
      if (found.length !== new Set(tagIds).size) throw new ApiError(400, 'یکی از مواد اولیه پیدا نشد', 'INGREDIENT_NOT_FOUND');
    }

    const recipe = await db.transaction(async (tx) => {
      const [row] = await tx.insert(schema.recipes).values({
        slug: input.slug, title: input.title, summary: input.summary,
        categoryId: input.categoryId ?? null, protein: input.protein,
        prepTimeMinutes: input.prepTimeMinutes ?? null, servings: input.servings ?? null,
        steps: input.steps, instagramUrl: input.instagramUrl ?? null, videoUrl: input.videoUrl ?? null,
        imageUrl: input.imageUrl ?? null, isPublished: input.isPublished, sortOrder: input.sortOrder,
      }).returning();
      if (!row) throw new ApiError(500, 'خطا در ساخت رسپی', 'INSERT_FAILED');

      if (input.ingredients.length > 0) {
        await tx.insert(schema.recipeIngredients).values(
          input.ingredients.map(i => ({ recipeId: row.id, ingredientTagId: i.ingredientTagId, quantityLabel: i.quantityLabel, sortOrder: i.sortOrder })),
        );
      }
      return row;
    });

    return NextResponse.json({ recipe }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
