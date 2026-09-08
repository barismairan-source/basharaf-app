import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { rowToHubItem } from '@/lib/db/hubSerializers';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  kind: z.enum(['menu', 'apply', 'instagram', 'phone', 'reserve', 'order', 'custom']).optional().default('custom'),
  label: z.string().min(1).max(60),
  url: z.string().min(1).max(500),
  isVisible: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
});

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const input = createSchema.parse(await req.json());
    const [row] = await db.insert(schema.linkHubItems).values(input).returning();
    if (!row) throw new ApiError(500, 'خطا در ساخت لینک', 'INSERT_FAILED');
    return NextResponse.json({ item: rowToHubItem(row) }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
