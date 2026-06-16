import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { rowToMenuCategory } from '@/lib/db/menuSerializers';

export const dynamic = 'force-dynamic';


const createSchema = z.object({
  slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/, 'فقط حروف کوچک انگلیسی، عدد و خط تیره'),
  labelEn: z.string().min(1).max(80),
  labelFa: z.string().min(1).max(80),
  sortOrder: z.number().int().optional().default(0),
  vatRate: z.number().int().min(0).max(100).nullable().optional(),
});

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const input = createSchema.parse(await req.json());
    const [row] = await db.insert(schema.menuCategories).values(input).returning();
    if (!row) throw new ApiError(500, 'خطا در ساخت دسته', 'INSERT_FAILED');
    return NextResponse.json({ category: rowToMenuCategory(row) }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
