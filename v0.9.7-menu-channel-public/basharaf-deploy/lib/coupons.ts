import { jalaliToDate, getTodayJalali } from '@/lib/jalali';

/**
 * lib/coupons.ts — منطق خالص کوپن (بدون وابستگی به DB).
 * تاریخ‌ها رشته‌ی شمسی‌اند؛ مقایسه با تبدیل به Date انجام می‌شود.
 */

export interface DiscountInput {
  discountType: string; // 'percent' | 'fixed'
  value: number;
  minOrder: number;
  maxDiscount: number | null;
}

/** آیا امروز (شمسی) در بازه‌ی [from, to] است؟ شامل ابتدا و انتها. */
export function isWithinJalaliRange(
  from: string,
  to: string,
  today: string = getTodayJalali(),
): boolean {
  const f = jalaliToDate(from);
  const t = jalaliToDate(to);
  const n = jalaliToDate(today);
  if (!f || !t || !n) return false;
  return n.getTime() >= f.getTime() && n.getTime() <= t.getTime();
}

/**
 * مبلغ تخفیف (تومان صحیح) برای یک سفارش.
 * صفر یعنی تخفیفی اعمال نمی‌شود. هرگز بیش از مبلغ سفارش نمی‌شود.
 */
export function computeDiscount(c: DiscountInput, amount: number): number {
  if (amount <= 0 || amount < c.minOrder) return 0;

  let d =
    c.discountType === 'percent'
      ? Math.floor((amount * c.value) / 100)
      : Math.min(c.value, amount);

  if (c.maxDiscount != null && d > c.maxDiscount) d = c.maxDiscount;
  if (d > amount) d = amount;
  return Math.max(0, Math.trunc(d));
}
