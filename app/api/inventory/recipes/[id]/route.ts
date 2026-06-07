import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    // soft-delete
    const [r] = await db.update(schema.invRecipes)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(schema.invRecipes.id, params.id)).returning();
    if (!r) throw new ApiError(404, 'رسپی پیدا نشد', 'NOT_FOUND');
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
