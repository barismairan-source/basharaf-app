import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    if (session.role === 'Warehouse' || session.role === 'Chef') {
      throw new ApiError(403, 'دسترسی ندارید', 'FORBIDDEN');
    }
    const [existing] = await db.select().from(schema.tableBlocks).where(eq(schema.tableBlocks.id, params.id));
    if (!existing) throw new ApiError(404, 'مسدودی پیدا نشد', 'NOT_FOUND');
    if (session.role !== 'SuperAdmin' && existing.branchId !== session.branchId) {
      throw new ApiError(404, 'مسدودی پیدا نشد', 'NOT_FOUND');
    }
    await db.delete(schema.tableBlocks).where(eq(schema.tableBlocks.id, params.id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
