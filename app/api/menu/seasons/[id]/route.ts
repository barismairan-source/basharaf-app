import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { rowToMenuSeason } from '@/lib/db/menuSerializers';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  nameFa: z.string().min(1).max(80).optional(),
  nameEn: z.string().max(80).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
});

/** PATCH /api/menu/seasons/[id] — فقط ویرایش نام/یادداشت (تغییر فصل جاری فقط با POST جدید انجام می‌شود). */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const input = patchSchema.parse(await req.json());
    const [row] = await db.update(schema.menuSeasons)
      .set(input).where(eq(schema.menuSeasons.id, params.id)).returning();
    if (!row) throw new ApiError(404, 'فصل پیدا نشد', 'NOT_FOUND');
    return NextResponse.json({ season: rowToMenuSeason(row) });
  } catch (e) {
    return handleError(e);
  }
}
