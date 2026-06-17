import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';

const patchBodySchema = z.object({
  name: z.string().min(2).max(40),
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
      .update(schema.categories)
      .set({ name: input.name })
      .where(eq(schema.categories.id, params.id))
      .returning();

    if (!updated) {
      throw new ApiError(404, 'دسته پیدا نشد', 'CATEGORY_NOT_FOUND');
    }

    return NextResponse.json({ category: updated });
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
        .delete(schema.categories)
        .where(eq(schema.categories.id, params.id))
        .returning({ id: schema.categories.id });

      if (result.length === 0) {
        throw new ApiError(404, 'دسته پیدا نشد', 'CATEGORY_NOT_FOUND');
      }
    } catch (e) {
      if (
        e instanceof Error &&
        (e.message.includes('foreign key') || e.message.includes('violates'))
      ) {
        throw new ApiError(
          409,
          'این دسته دارای تراکنش است و قابل حذف نیست',
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
