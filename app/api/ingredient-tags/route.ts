import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { rowToIngredientTag } from '@/lib/db/recipeSerializers';

export const dynamic = 'force-dynamic';

const createSchema = z.object({ name: z.string().min(1).max(60) });

/** GET /api/ingredient-tags — عمومی؛ واژگان مواد اولیه برای فیلتر «با چی که دارم». */
export async function GET() {
  try {
    const rows = await db.select().from(schema.ingredientTags).orderBy(asc(schema.ingredientTags.name));
    return NextResponse.json({ tags: rows.map(rowToIngredientTag) });
  } catch (e) {
    return handleError(e);
  }
}

/** POST /api/ingredient-tags — ادمین؛ get-or-create (اگر نام تکراری بود، همان تگ موجود برگردانده می‌شود). */
export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { name } = createSchema.parse(await req.json());
    const trimmed = name.trim();

    const existing = await db.select().from(schema.ingredientTags).where(eq(schema.ingredientTags.name, trimmed));
    if (existing[0]) return NextResponse.json({ tag: rowToIngredientTag(existing[0]) });

    const [row] = await db.insert(schema.ingredientTags).values({ name: trimmed }).returning();
    if (!row) throw new ApiError(500, 'خطا در ساخت تگ', 'INSERT_FAILED');
    return NextResponse.json({ tag: rowToIngredientTag(row) }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
