import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { rowToMenuSeason } from '@/lib/db/menuSerializers';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  nameFa: z.string().min(1).max(80),
  nameEn: z.string().max(80).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
});

/** GET /api/menu/seasons — فهرست فصل‌ها، جدیدترین اول (فقط ادمین). */
export async function GET() {
  try {
    await requireAdmin();
    const rows = await db.select().from(schema.menuSeasons).orderBy(desc(schema.menuSeasons.startedAt));
    return NextResponse.json({ seasons: rows.map(rowToMenuSeason) });
  } catch (e) {
    return handleError(e);
  }
}

/** POST /api/menu/seasons — شروع فصل جدید؛ فصل قبلی از حالت «جاری» خارج می‌شود. */
export async function POST(req: Request) {
  try {
    await requireAdmin();
    const input = createSchema.parse(await req.json());
    const row = await db.transaction(async (tx) => {
      await tx.update(schema.menuSeasons).set({ isCurrent: false }).where(eq(schema.menuSeasons.isCurrent, true));
      const [created] = await tx.insert(schema.menuSeasons).values({ ...input, isCurrent: true }).returning();
      if (!created) throw new ApiError(500, 'خطا در ساخت فصل', 'INSERT_FAILED');
      return created;
    });
    return NextResponse.json({ season: rowToMenuSeason(row) }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
