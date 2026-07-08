import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { z } from 'zod';

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  subtitle: z.string().max(500).nullish(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const body = patchSchema.parse(await req.json());

    const [section] = await db
      .select()
      .from(schema.formSections)
      .where(eq(schema.formSections.id, params.id))
      .limit(1);
    if (!section) throw new ApiError(404, 'مرحله یافت نشد', 'NOT_FOUND');

    const update: Partial<typeof schema.formSections.$inferInsert> = { updatedAt: new Date() };
    if (body.title !== undefined)    update.title = body.title;
    if (body.subtitle !== undefined) update.subtitle = body.subtitle ?? null;
    if (body.isActive !== undefined) update.isActive = body.isActive;

    await db
      .update(schema.formSections)
      .set(update)
      .where(eq(schema.formSections.id, params.id));

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
