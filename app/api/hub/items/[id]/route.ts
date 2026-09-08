import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { rowToHubItem } from '@/lib/db/hubSerializers';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  kind: z.enum(['menu', 'apply', 'instagram', 'phone', 'reserve', 'order', 'custom']).optional(),
  label: z.string().min(1).max(60).optional(),
  url: z.string().min(1).max(500).optional(),
  isVisible: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const input = patchSchema.parse(await req.json());
    const [row] = await db.update(schema.linkHubItems)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(schema.linkHubItems.id, params.id)).returning();
    if (!row) throw new ApiError(404, 'لینک پیدا نشد', 'NOT_FOUND');
    return NextResponse.json({ item: rowToHubItem(row) });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    await db.delete(schema.linkHubItems).where(eq(schema.linkHubItems.id, params.id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
