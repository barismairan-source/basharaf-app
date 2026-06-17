import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';

const patchBodySchema = z.object({
  name: z.string().min(2).max(60).optional(),
  address: z.string().min(5).max(200).optional(),
  manager: z.string().min(2).max(80).optional(),
  opened: z.string().min(1).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const body = await req.json();
    const input = patchBodySchema.parse(body);

    const [updated] = await db
      .update(schema.branches)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(schema.branches.id, params.id))
      .returning();

    if (!updated) {
      throw new ApiError(404, 'شعبه پیدا نشد', 'BRANCH_NOT_FOUND');
    }

    return NextResponse.json({ branch: updated });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    try {
      const result = await db
        .delete(schema.branches)
        .where(eq(schema.branches.id, params.id))
        .returning({ id: schema.branches.id });

      if (result.length === 0) {
        throw new ApiError(404, 'شعبه پیدا نشد', 'BRANCH_NOT_FOUND');
      }
    } catch (e) {
      // foreign key violation از DB → پیام مناسب
      if (
        e instanceof Error &&
        (e.message.includes('foreign key') || e.message.includes('violates'))
      ) {
        throw new ApiError(
          409,
          'این شعبه دارای تراکنش یا کاربر است و قابل حذف نیست',
          'FK_VIOLATION'
        );
      }
      throw e;
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
