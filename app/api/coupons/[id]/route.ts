import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';

const patchSchema = z
  .object({
    code: z.string().min(2).max(64).optional(),
    discountType: z.enum(['percent', 'fixed']).optional(),
    value: z.number().int().positive().optional(),
    minOrder: z.number().int().nonnegative().optional(),
    maxDiscount: z.number().int().positive().nullable().optional(),
    validFrom: z.string().min(6).max(12).optional(),
    validTo: z.string().min(6).max(12).optional(),
    usageLimit: z.number().int().positive().nullable().optional(),
    branchId: z.string().uuid().nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => d.discountType !== 'percent' || d.value == null || d.value <= 100, {
    message: 'درصد تخفیف نباید بیش از ۱۰۰ باشد',
    path: ['value'],
  });

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const input = patchSchema.parse(await req.json());
    const [updated] = await db
      .update(schema.coupons)
      .set({ ...input })
      .where(eq(schema.coupons.id, params.id))
      .returning();
    if (!updated) throw new ApiError(404, 'کوپن پیدا نشد', 'NOT_FOUND');
    return NextResponse.json({
      coupon: {
        ...updated,
        value: Number(updated.value),
        minOrder: Number(updated.minOrder),
        maxDiscount: updated.maxDiscount == null ? null : Number(updated.maxDiscount),
        createdAt: updated.createdAt.toISOString(),
      },
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    await db
      .update(schema.coupons)
      .set({ isActive: false })
      .where(eq(schema.coupons.id, params.id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
