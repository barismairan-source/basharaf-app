/**
 * محاسبه‌ی VAT از مبلغ فروش — منطق خالص بدون DB.
 *
 * فرمول: VAT از مبلغ کل (tax-inclusive):
 *   net = round(total / (1 + rate/100))
 *   vat = total - net
 *
 * این دقیقاً همان منطق split-VAT در lib/ordering/orderAccounting.ts است.
 */

export const DEFAULT_VAT_RATE = 10;

export interface VatLine {
  lineTotal: number;
  vatRate?: number | null;
}

/** محاسبه‌ی VAT یک خط از مبلغ کل. */
export function lineVat(lineTotal: number, vatRate: number = DEFAULT_VAT_RATE): number {
  const divisor = 1 + vatRate / 100;
  const net = Math.round(lineTotal / divisor);
  return lineTotal - net;
}

/** جمع VAT همه‌ی خطوط یک سفارش (tax-inclusive). */
export function orderVat(lines: VatLine[]): number {
  let total = 0;
  for (const line of lines) {
    const rate = line.vatRate ?? DEFAULT_VAT_RATE;
    total += lineVat(line.lineTotal, rate);
  }
  return total;
}
