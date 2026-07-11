import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; pbId: string } }
) {
  try {
    await requireAdmin();
    const [link] = await db
      .select({ id: schema.partnerBranches.id })
      .from(schema.partnerBranches)
      .where(
        and(
          eq(schema.partnerBranches.id, params.pbId),
          eq(schema.partnerBranches.partnerId, params.id),
        )
      )
      .limit(1);
    if (!link) throw new ApiError(404, 'رابطه پیدا نشد', 'NOT_FOUND');

    await db
      .update(schema.partnerBranches)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(schema.partnerBranches.id, params.pbId));

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
