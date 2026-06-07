import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { rowToMenuItem } from '@/lib/db/menuSerializers';

export const dynamic = 'force-dynamic';


const patchSchema = z.object({
  categoryId: z.string().uuid().optional(),
  titleEn: z.string().min(1).max(160).optional(),
  titleFa: z.string().min(1).max(160).optional(),
  descriptionEn: z.string().max(500).optional(),
  descriptionFa: z.string().max(500).optional(),
  price: z.number().min(0).max(999_999_999).optional(),
  isAvailable: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const input = patchSchema.parse(await req.json());
    const [row] = await db.update(schema.menuItems)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(schema.menuItems.id, params.id)).returning();
    if (!row) throw new ApiError(404, 'آیتم پیدا نشد', 'NOT_FOUND');
    return NextResponse.json({ item: rowToMenuItem(row) });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    await db.delete(schema.menuItems).where(eq(schema.menuItems.id, params.id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
