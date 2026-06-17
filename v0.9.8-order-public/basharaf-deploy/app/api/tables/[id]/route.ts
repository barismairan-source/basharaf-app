import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';

const patchSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  capacity: z.number().int().nonnegative().optional(),
  area: z.string().max(60).nullable().optional(),
  isActive: z.boolean().optional(),
});

function ensureScope(role: string, branchId: string | null, tableBranch: string): void {
  if (role === 'SuperAdmin') return;
  if (!branchId || tableBranch !== branchId) {
    throw new ApiError(404, 'میز پیدا نشد', 'NOT_FOUND');
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    const [existing] = await db
      .select()
      .from(schema.restaurantTables)
      .where(eq(schema.restaurantTables.id, params.id));
    if (!existing) throw new ApiError(404, 'میز پیدا نشد', 'NOT_FOUND');
    ensureScope(session.role, session.branchId, existing.branchId);

    const input = patchSchema.parse(await req.json());
    const [updated] = await db
      .update(schema.restaurantTables)
      .set({ ...input })
      .where(eq(schema.restaurantTables.id, params.id))
      .returning();
    if (!updated) throw new ApiError(404, 'میز پیدا نشد', 'NOT_FOUND');
    return NextResponse.json({
      table: { ...updated, createdAt: updated.createdAt.toISOString() },
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    const [existing] = await db
      .select()
      .from(schema.restaurantTables)
      .where(eq(schema.restaurantTables.id, params.id));
    if (!existing) throw new ApiError(404, 'میز پیدا نشد', 'NOT_FOUND');
    ensureScope(session.role, session.branchId, existing.branchId);

    await db
      .update(schema.restaurantTables)
      .set({ isActive: false })
      .where(eq(schema.restaurantTables.id, params.id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
