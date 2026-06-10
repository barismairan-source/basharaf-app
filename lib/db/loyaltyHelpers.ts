import { and, eq, sql } from 'drizzle-orm';
import { schema } from './client';
import { ApiError } from '@/lib/api-error';
import { tierForPoints } from '@/lib/loyalty';

/**
 * Loyalty integrity helper — قلب صحت امتیاز.
 *
 * customers.points یک مانده‌ی denormalized است؛ تنها مسیر مجاز تغییرش
 * همین تابع است (مثل balanceHelpers برای موجودی صندوق).
 *
 * قانون طلایی:
 *   - تغییر مانده فقط با sql increment اتمیک (`points + ${delta}`).
 *   - مانده هرگز منفی نمی‌شود (آپدیت شرطی؛ redeem بیش از موجودی → throw).
 *   - tier بعد از هر تغییر از روی مانده‌ی جدید بازمحاسبه می‌شود.
 *   - هر تغییر یک ردیف در loyalty_entries لاگ می‌کند.
 *
 * باید داخل db.transaction صدا زده شود تا سه عملیات اتمیک بمانند.
 */

export interface ApplyLoyaltyParams {
  customerId: string;
  branchId: string;
  /** delta علامت‌دار: earn>0، redeem<0، adjust ±. */
  delta: number;
  type: 'earn' | 'redeem' | 'adjust';
  reason: string;
  refTransactionId: string | null;
  createdBy: string;
}

export interface ApplyLoyaltyResult {
  /** مانده‌ی جدید امتیاز */
  points: number;
  tier: string;
  entryId: string;
}

export async function applyLoyalty(
  tx: any,
  p: ApplyLoyaltyParams,
): Promise<ApplyLoyaltyResult> {
  // ۱. آپدیت اتمیک + شرطی: فقط اگر مانده‌ی جدید >= 0 باشد آپدیت می‌شود.
  const [row] = await tx
    .update(schema.customers)
    .set({ points: sql`points + ${p.delta}`, updatedAt: new Date() })
    .where(
      and(eq(schema.customers.id, p.customerId), sql`points + ${p.delta} >= 0`),
    )
    .returning({ points: schema.customers.points });

  if (!row) {
    // یا مشتری وجود ندارد یا امتیاز کافی برای مصرف نیست — تفکیک می‌کنیم.
    const [exists] = await tx
      .select({ id: schema.customers.id })
      .from(schema.customers)
      .where(eq(schema.customers.id, p.customerId));
    if (!exists) throw new ApiError(404, 'مشتری پیدا نشد', 'NOT_FOUND');
    throw new ApiError(400, 'امتیاز کافی برای مصرف وجود ندارد', 'INSUFFICIENT_POINTS');
  }

  const nextPoints = Number(row.points);
  const nextTier = tierForPoints(nextPoints);

  // ۲. بازمحاسبه‌ی tier از روی مانده‌ی جدید.
  await tx
    .update(schema.customers)
    .set({ tier: nextTier })
    .where(eq(schema.customers.id, p.customerId));

  // ۳. لاگ در دفتر امتیاز.
  const [entry] = await tx
    .insert(schema.loyaltyEntries)
    .values({
      customerId: p.customerId,
      branchId: p.branchId,
      type: p.type,
      points: p.delta,
      reason: p.reason,
      refTransactionId: p.refTransactionId,
      createdBy: p.createdBy,
    })
    .returning({ id: schema.loyaltyEntries.id });

  if (!entry) throw new ApiError(500, 'خطا در ثبت رویداد امتیاز', 'LOYALTY_INSERT_FAILED');

  return { points: nextPoints, tier: nextTier, entryId: entry.id };
}
