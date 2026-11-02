/**
 * تاریخچه‌ی واریزی‌های پرسنل (جدول staff_payments) — فقط نمایش؛ جدا از حسابداری و فیش‌ها.
 * هر ردیف یک واریز بانکی است (از رسید یا لیست ارسالی به بانک). شماره‌ی شبا هرگز ذخیره یا برگردانده نمی‌شود.
 */

export type PaymentKind = 'salary' | 'overtime' | 'advance' | 'other';

export const PAYMENT_KIND_LABEL: Record<PaymentKind, string> = {
  salary: 'حقوق', overtime: 'اضافه‌کاری', advance: 'مساعده', other: 'سایر',
};

export interface PaymentItem {
  id: string; period: string; kind: PaymentKind; amount: number; paidOn: string | null; title: string; hasReceipt: boolean;
}

/** جدیدترین بالا: اول تاریخ واریز، بعد ماه. ردیف بی‌تاریخ بعد از هم‌ماهی‌های تاریخ‌دار. */
export function sortPayments<T extends Pick<PaymentItem, 'paidOn' | 'period'>>(items: T[]): T[] {
  const key = (p: T) => `${p.paidOn ?? `${p.period.replace('-', '/')}/00`}`;
  return [...items].sort((a, b) => key(b).localeCompare(key(a)) || b.period.localeCompare(a.period));
}

/** جمع کل و جمع هر ماه (برای خلاصه‌ی بالای فهرست). */
export function summarizePayments(items: Pick<PaymentItem, 'period' | 'amount'>[]): { total: number; byPeriod: Record<string, number> } {
  const byPeriod: Record<string, number> = {};
  let total = 0;
  for (const p of items) { total += p.amount; byPeriod[p.period] = (byPeriod[p.period] ?? 0) + p.amount; }
  return { total, byPeriod };
}
