import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession, requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { rowToInvItem } from '@/lib/db/inventory.serializers';

const patchSchema = z.object({
  code: z.string().min(1).max(40).optional(),
  name: z.string().min(1).max(120).optional(),
  category: z.string().max(60).optional(),
  kind: z.enum(['raw', 'prep']).optional(),
  unit: z.enum(['kg', 'g', 'L', 'ml', 'pcs', 'can', 'pack']).optional(),
  basePerUnit: z.number().positive().optional(),
  yieldPct: z.number().min(1).max(100).optional(),
  minBase: z.number().min(0).optional(),
  shelfLifeDays: z.number().int().min(1).optional(),
  batchYieldBase: z.number().positive().optional().nullable(),
  prepRecipe: z.array(z.object({
    itemId: z.string().uuid(),
    qtyBase: z.number().positive(),
  })).optional().nullable(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireSession();
    const input = patchSchema.parse(await req.json());
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    for (const [k, v] of Object.entries(input)) {
      if (v === undefined) continue;
      if (k === 'basePerUnit' || k === 'yieldPct' || k === 'minBase') {
        patch[k] = String(v);
      } else if (k === 'batchYieldBase') {
        patch[k] = v != null ? String(v) : null;
      } else {
        patch[k] = v;
      }
    }
    const [row] = await db.update(schema.invItems).set(patch)
      .where(eq(schema.invItems.id, params.id)).returning();
    if (!row) throw new ApiError(404, 'قلم پیدا نشد', 'NOT_FOUND');
    return NextResponse.json({ item: rowToInvItem(row) });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const [row] = await db.update(schema.invItems)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(schema.invItems.id, params.id)).returning();
    if (!row) throw new ApiError(404, 'قلم پیدا نشد', 'NOT_FOUND');
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
