import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { rowToRecipeCategory } from '@/lib/db/recipeSerializers';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/).optional(),
  label: z.string().min(1).max(60).optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const input = patchSchema.parse(await req.json());
    const [row] = await db.update(schema.recipeCategories).set(input).where(eq(schema.recipeCategories.id, params.id)).returning();
    if (!row) throw new ApiError(404, 'دسته پیدا نشد', 'NOT_FOUND');
    return NextResponse.json({ category: rowToRecipeCategory(row) });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const inUse = await db.select({ id: schema.recipes.id }).from(schema.recipes).where(eq(schema.recipes.categoryId, params.id)).limit(1);
    if (inUse.length > 0) throw new ApiError(409, 'این دسته رسپی دارد و قابل حذف نیست', 'CATEGORY_IN_USE');
    await db.delete(schema.recipeCategories).where(eq(schema.recipeCategories.id, params.id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
