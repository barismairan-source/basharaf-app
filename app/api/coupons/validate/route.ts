import { NextResponse } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { computeDiscount, isWithinJalaliRange } from '@/lib/coupons';

const bodySchema = z.object({
  code: z.string().min(1).max(64).transform((v) => v.trim()),
  amount: z.number().int().nonnegative(),
  customerId: z.string().uuid().nullable().optional(),
  branchId: z.string().uuid().nullable().optional(),
  refTransactionId: z.string().uuid().nullable().optional(),
  /** false/غایب = فقط اعتبارسنجی (پیش‌نمایش)؛ true = مصرف اتمیک. */
  commit: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const input = bodySchema.parse(await req.json());

    // شعبه‌ی عمل: BranchUser شعبه‌ی خودش؛ SuperAdmin می‌تواند branchId بدهد
    const actingBranch =
      session.role === 'SuperAdmin' ? (input.branchId ?? null) : session.branchId;

    const [coupon] = await db
      .select()
      .from(schema.coupons)
      .where(eq(schema.coupons.code, input.code));

    const invalid = (reason: string) => NextResponse.json({ valid: false, reason });

    if (!coupon || !coupon.isActive) return invalid('کد تخفیف نامعتبر است');
    if (coupon.branchId && coupon.branchId !== actingBranch) {
      return invalid('این کد برای شعبه‌ی شما معتبر نیست');
    }
    if (!isWithinJalaliRange(coupon.validFrom, coupon.validTo)) {
      return invalid('کد تخفیف منقضی شده یا هنوز فعال نشده است');
    }
    if (input.amount < Number(coupon.minOrder)) {
      return invalid('حداقل مبلغ سفارش برای این کد رعایت نشده است');
    }
    if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
      return invalid('سقف مصرف این کد تکمیل شده است');
    }

    const discountAmount = computeDiscount(
      {
        discountType: coupon.discountType,
        value: Number(coupon.value),
        minOrder: Number(coupon.minOrder),
        maxDiscount: coupon.maxDiscount == null ? null : Number(coupon.maxDiscount),
      },
      input.amount,
    );
    if (discountAmount <= 0) return invalid('این کد برای این مبلغ تخفیفی ندارد');

    // فقط پیش‌نمایش — بدون مصرف
    if (!input.commit) {
      return NextResponse.json({
        valid: true,
        committed: false,
        couponId: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountAmount,
      });
    }

    // مصرف: اعمال used_count اتمیک (شرطی) + ثبت redemption، در یک تراکنش
    const branchForRedeem = coupon.branchId ?? actingBranch ?? null;
    if (!branchForRedeem) {
      throw new ApiError(400, 'شعبه برای ثبت مصرف کوپن مشخص نیست', 'BRANCH_REQUIRED');
    }

    const redemptionId = await db.transaction(async (dbTx) => {
      const [updated] = await dbTx
        .update(schema.coupons)
        .set({ usedCount: sql`used_count + 1` })
        .where(
          and(
            eq(schema.coupons.id, coupon.id),
            sql`(usage_limit is null or used_count < usage_limit)`,
          ),
        )
        .returning({ id: schema.coupons.id });
      if (!updated) throw new ApiError(409, 'سقف مصرف این کد تکمیل شده است', 'USAGE_LIMIT_REACHED');

      const [r] = await dbTx
        .insert(schema.couponRedemptions)
        .values({
          couponId: coupon.id,
          customerId: input.customerId ?? null,
          branchId: branchForRedeem,
          discountAmount,
          refTransactionId: input.refTransactionId ?? null,
          createdBy: session.sub,
        })
        .returning({ id: schema.couponRedemptions.id });
      if (!r) throw new ApiError(500, 'خطا در ثبت مصرف کوپن', 'REDEEM_FAILED');
      return r.id;
    });

    return NextResponse.json(
      {
        valid: true,
        committed: true,
        couponId: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountAmount,
        redemptionId,
      },
      { status: 201 },
    );
  } catch (e) {
    return handleError(e);
  }
}
