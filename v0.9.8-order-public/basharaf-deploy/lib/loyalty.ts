/**
 * lib/loyalty.ts — منطق خالص باشگاه وفاداری (بدون وابستگی به DB).
 *
 * نرخ کسب امتیاز از app_settings کلید `loyalty_earn_rate` خوانده می‌شود
 * (با fallback به DEFAULT_EARN_RATE). آستانه‌های tier اینجا تعریف شده‌اند
 * و در helper اتمیک امتیاز برای بازمحاسبه‌ی customers.tier استفاده می‌شوند.
 */

/** سطوح وفاداری به ترتیب صعودیِ آستانه (بر اساس مجموع امتیاز). */
export const LOYALTY_TIERS = [
  { key: 'bronze', label: 'برنزی', minPoints: 0 },
  { key: 'silver', label: 'نقره‌ای', minPoints: 5000 },
  { key: 'gold', label: 'طلایی', minPoints: 20000 },
  { key: 'platinum', label: 'پلاتین', minPoints: 50000 },
] as const;

export type LoyaltyTierKey = (typeof LOYALTY_TIERS)[number]['key'];

/** کلید و پیش‌فرض نرخ کسب: هر ۱۰٬۰۰۰ تومان = ۱ امتیاز. */
export const LOYALTY_EARN_RATE_KEY = 'loyalty_earn_rate';
export const DEFAULT_EARN_RATE = 10000;

/** امتیاز قابل کسب از یک مبلغ فروش (تومان). */
export function pointsForAmount(amount: number, earnRate: number = DEFAULT_EARN_RATE): number {
  if (earnRate <= 0) return 0;
  return Math.floor(amount / earnRate);
}

/** سطح متناظر با یک مقدار امتیاز (بالاترین آستانه‌ای که points از آن عبور کرده). */
export function tierForPoints(points: number): LoyaltyTierKey {
  let tier: LoyaltyTierKey = 'bronze';
  for (const t of LOYALTY_TIERS) {
    if (points >= t.minPoints) tier = t.key;
  }
  return tier;
}

/** برچسب فارسی یک سطح (برای نمایش در UI). */
export function tierLabel(key: string): string {
  const found = LOYALTY_TIERS.find((t) => t.key === key);
  return found ? found.label : key;
}
