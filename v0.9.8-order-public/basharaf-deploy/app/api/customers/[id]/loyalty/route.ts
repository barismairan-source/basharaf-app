import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { audit } from '@/lib/auth/audit';
import { applyLoyalty } from '@/lib/db/loyaltyHelpers';
import { pointsForAmount, DEFAULT_EARN_RATE, LOYALTY_EARN_RATE_KEY } from '@/lib/loyalty';

const bodySchema = z.object({
  type: z.enum(['earn', 'redeem', 'adjust']),
  points: z.number().int().optional(), // earn (صریح) / redeem (>0) / adjust (±)
  amount: z.number().int().nonnegative().optional(), // فقط earn: امتیاز از نرخ محاسبه می‌شود
  reason: z.string().max(300).optional(),
  refTransactionId: z.string().uuid().nullable().optional(),
});

async function readEarnRate(): Promise<number> {
  const [s] = await db
    .select()
    .from(schema.appSettings)
    .where(eq(schema.appSettings.key, LOYALTY_EARN_RATE_KEY));
  const n = s ? Number(s.value) : NaN;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_EARN_RATE;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();

    const [customer] = await db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.id, params.id));
    if (!customer) throw new ApiError(404, 'مشتری پیدا نشد', 'NOT_FOUND');

    // scope شعبه: BranchUser فقط مشتری شعبه‌ی خودش
    if (
      session.role !== 'SuperAdmin' &&
      (!session.branchId || customer.homeBranchId !== session.branchId)
    ) {
      throw new ApiError(404, 'مشتری پیدا نشد', 'NOT_FOUND');
    }

    const input = bodySchema.parse(await req.json());

    // شعبه‌ی ثبت رویداد: شعبه‌ی مشتری، در غیر این صورت شعبه‌ی کاربر
    const branchId = customer.homeBranchId ?? session.branchId ?? null;
    if (!branchId) throw new ApiError(400, 'شعبه برای ثبت امتیاز مشخص نیست', 'BRANCH_REQUIRED');

    // محاسبه‌ی delta علامت‌دار بر اساس نوع
    let delta: number;
    if (input.type === 'earn') {
      let pts = input.points ?? null;
      if (pts == null) {
        if (input.amount == null) {
          throw new ApiError(400, 'مبلغ یا امتیاز لازم است', 'POINTS_REQUIRED');
        }
        pts = pointsForAmount(input.amount, await readEarnRate());
      }
      if (pts <= 0) throw new ApiError(400, 'امتیاز کسب باید مثبت باشد', 'INVALID_POINTS');
      delta = pts;
    } else if (input.type === 'redeem') {
      if (input.points == null || input.points <= 0) {
        throw new ApiError(400, 'امتیاز مصرف باید مثبت باشد', 'INVALID_POINTS');
      }
      delta = -input.points;
    } else {
      if (input.points == null || input.points === 0) {
        throw new ApiError(400, 'مقدار اصلاح نامعتبر است', 'INVALID_POINTS');
      }
      delta = input.points;
    }

    const result = await db.transaction(async (dbTx) =>
      applyLoyalty(dbTx, {
        customerId: customer.id,
        branchId,
        delta,
        type: input.type,
        reason: input.reason ?? '',
        refTransactionId: input.refTransactionId ?? null,
        createdBy: session.sub,
      }),
    );

    audit({
      action: `loyalty.${input.type}`,
      userId: session.sub,
      meta: { customerId: customer.id, delta, points: result.points },
    });

    return NextResponse.json(
      { points: result.points, tier: result.tier, entryId: result.entryId },
      { status: 201 },
    );
  } catch (e) {
    return handleError(e);
  }
}
