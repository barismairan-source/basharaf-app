import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { rowToMenuCategory } from '@/lib/db/menuSerializers';

const patchSchema = z.object({
  labelEn: z.string().min(1).max(80).optional(),
  labelFa: z.string().min(1).max(80).optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const input = patchSchema.parse(await req.json());
    const [row] = await db.update(schema.menuCategories)
      .set(input).where(eq(schema.menuCategories.id, params.id)).returning();
    if (!row) throw new ApiError(404, 'دسته پیدا نشد', 'NOT_FOUND');
    return NextResponse.json({ category: rowToMenuCategory(row) });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    try {
      await db.delete(schema.menuCategories).where(eq(schema.menuCategories.id, params.id));
    } catch {
      throw new ApiError(409, 'این دسته آیتم دارد — ابتدا آیتم‌ها را حذف یا جابجا کنید', 'HAS_ITEMS');
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
