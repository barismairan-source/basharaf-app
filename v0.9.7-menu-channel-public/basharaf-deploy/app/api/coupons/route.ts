import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';

const createSchema = z
  .object({
    code: z.string().min(2).max(64).transform((v) => v.trim()),
    discountType: z.enum(['percent', 'fixed']),
    value: z.number().int().positive(),
    minOrder: z.number().int().nonnegative().default(0),
    maxDiscount: z.number().int().positive().nullable().optional(),
    validFrom: z.string().min(6).max(12),
    validTo: z.string().min(6).max(12),
    usageLimit: z.number().int().positive().nullable().optional(),
    branchId: z.string().uuid().nullable().optional(),
  })
  .refine((d) => d.discountType !== 'percent' || d.value <= 100, {
    message: 'درصد تخفیف نباید بیش از ۱۰۰ باشد',
    path: ['value'],
  });

type CouponRow = typeof schema.coupons.$inferSelect;

function serialize(c: CouponRow) {
  return {
    id: c.id,
    code: c.code,
    discountType: c.discountType,
    value: Number(c.value),
    minOrder: Number(c.minOrder),
    maxDiscount: c.maxDiscount == null ? null : Number(c.maxDiscount),
    validFrom: c.validFrom,
    validTo: c.validTo,
    usageLimit: c.usageLimit,
    usedCount: c.usedCount,
    branchId: c.branchId,
    isActive: c.isActive,
    createdAt: c.createdAt.toISOString(),
  };
}

export async function GET() {
  try {
    await requireAdmin();
    const rows = await db.select().from(schema.coupons)
      .where(eq(schema.coupons.isActive, true))
      .orderBy(desc(schema.coupons.createdAt));
    return NextResponse.json({ coupons: rows.map(serialize) });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const input = createSchema.parse(await req.json());
    const [c] = await db
      .insert(schema.coupons)
      .values({
        code: input.code,
        discountType: input.discountType,
        value: input.value,
        minOrder: input.minOrder,
        maxDiscount: input.maxDiscount ?? null,
        validFrom: input.validFrom,
        validTo: input.validTo,
        usageLimit: input.usageLimit ?? null,
        branchId: input.branchId ?? null,
      })
      .returning();
    if (!c) throw new ApiError(500, 'خطا در ساخت کوپن', 'INSERT_FAILED');
    return NextResponse.json({ coupon: serialize(c) }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
