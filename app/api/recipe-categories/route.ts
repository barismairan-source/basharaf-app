import { NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { rowToRecipeCategory } from '@/lib/db/recipeSerializers';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/, 'فقط حروف کوچک انگلیسی، عدد و خط تیره'),
  label: z.string().min(1).max(60),
  sortOrder: z.number().int().optional().default(0),
});

export async function GET() {
  try {
    const rows = await db.select().from(schema.recipeCategories).orderBy(asc(schema.recipeCategories.sortOrder));
    return NextResponse.json({ categories: rows.map(rowToRecipeCategory) });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const input = createSchema.parse(await req.json());
    const [row] = await db.insert(schema.recipeCategories).values(input).returning();
    if (!row) throw new ApiError(500, 'خطا در ساخت دسته', 'INSERT_FAILED');
    return NextResponse.json({ category: rowToRecipeCategory(row) }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
