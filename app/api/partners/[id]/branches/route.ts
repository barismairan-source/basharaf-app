import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';

const createSchema = z.object({
  branchId: z.string().uuid().nullable().optional(),
  joinedDate: z.string().max(20).optional(),
  sharePercent: z.string().max(10).optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();

    const [partner] = await db
      .select({ id: schema.partners.id })
      .from(schema.partners)
      .where(eq(schema.partners.id, params.id))
      .limit(1);
    if (!partner) throw new ApiError(404, 'شریک پیدا نشد', 'NOT_FOUND');

    const input = createSchema.parse(await req.json());
    const branchId = input.branchId ?? null;

    // بررسی تکراری نبودن (partial uniqueness در DB تضمین می‌شود — این فقط برای پیام بهتر)
    const existing = await db
      .select({ id: schema.partnerBranches.id })
      .from(schema.partnerBranches)
      .where(
        branchId === null
          ? and(eq(schema.partnerBranches.partnerId, params.id), eq(schema.partnerBranches.isActive, true))
          : and(
              eq(schema.partnerBranches.partnerId, params.id),
              eq(schema.partnerBranches.branchId, branchId),
              eq(schema.partnerBranches.isActive, true),
            )
      )
      .limit(1);
    if (existing.length > 0) throw new ApiError(409, 'این شریک قبلاً در این شعبه ثبت شده', 'DUPLICATE');

    const [inserted] = await db
      .insert(schema.partnerBranches)
      .values({
        partnerId: params.id,
        branchId,
        joinedDate: input.joinedDate ?? null,
        sharePercent: input.sharePercent ?? null,
      })
      .returning();
    if (!inserted) throw new ApiError(500, 'خطا در ثبت شعبه', 'INSERT_FAILED');

    return NextResponse.json({ ok: true, branchLinkId: inserted.id }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
