import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';

const patchSchema = z.object({
  fullName: z.string().min(2).max(100).transform(v => v.trim()).optional(),
  phone: z.string().max(20).nullable().optional(),
  nationalId: z.string().max(20).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const input = patchSchema.parse(await req.json());

    const [updated] = await db
      .update(schema.partners)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(schema.partners.id, params.id))
      .returning();

    if (!updated) throw new ApiError(404, 'شریک پیدا نشد', 'NOT_FOUND');

    return NextResponse.json({
      partner: {
        id: updated.id,
        fullName: updated.fullName,
        phone: updated.phone,
        nationalId: updated.nationalId,
        note: updated.note,
        isActive: updated.isActive,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const [partner] = await db
      .select({ id: schema.partners.id })
      .from(schema.partners)
      .where(eq(schema.partners.id, params.id))
      .limit(1);
    if (!partner) throw new ApiError(404, 'شریک پیدا نشد', 'NOT_FOUND');

    await db
      .update(schema.partners)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(schema.partners.id, params.id));

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
