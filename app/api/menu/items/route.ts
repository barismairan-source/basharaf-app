import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { rowToMenuItem } from '@/lib/db/menuSerializers';

export const dynamic = 'force-dynamic';


const createSchema = z.object({
  categoryId: z.string().uuid(),
  titleEn: z.string().min(1).max(160),
  titleFa: z.string().min(1).max(160),
  descriptionEn: z.string().max(500).optional().default(''),
  descriptionFa: z.string().max(500).optional().default(''),
  price: z.number().min(0).max(999_999_999),
  isAvailable: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
});

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const input = createSchema.parse(await req.json());
    const [row] = await db.insert(schema.menuItems).values(input).returning();
    if (!row) throw new ApiError(500, 'خطا در ساخت آیتم', 'INSERT_FAILED');
    return NextResponse.json({ item: rowToMenuItem(row) }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
