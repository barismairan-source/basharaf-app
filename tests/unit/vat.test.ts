import { describe, it, expect } from 'vitest';
import { lineVat, orderVat, DEFAULT_VAT_RATE } from '@/lib/financial/vat';

describe('lineVat', () => {
  it('extracts VAT from tax-inclusive amount at default 10%', () => {
    // برای 110,000 تومان (شامل ۱۰٪ مالیات):
    // net = round(110000 / 1.1) = round(100000) = 100000
    // vat = 110000 - 100000 = 10000
    expect(lineVat(110_000)).toBe(10_000);
  });

  it('handles 9% rate', () => {
    // net = round(109000 / 1.09) = round(100000) = 100000
    // vat = 109000 - 100000 = 9000
    expect(lineVat(109_000, 9)).toBe(9_000);
  });

  it('returns 0 for zero amount', () => {
    expect(lineVat(0)).toBe(0);
  });

  it('rounds net before subtracting (tax-inclusive rounding)', () => {
    // برای 111 تومان با نرخ 10%:
    // net = round(111 / 1.1) = round(100.909...) = 101
    // vat = 111 - 101 = 10
    expect(lineVat(111)).toBe(10);
  });

  it('uses DEFAULT_VAT_RATE when vatRate not specified', () => {
    expect(DEFAULT_VAT_RATE).toBe(10);
    expect(lineVat(100_000, DEFAULT_VAT_RATE)).toBe(lineVat(100_000));
  });
});

describe('orderVat', () => {
  it('sums VAT across all lines', () => {
    const lines = [
      { lineTotal: 110_000 },             // 10000 VAT @ 10%
      { lineTotal: 55_000 },              // 5000 VAT @ 10%
    ];
    expect(orderVat(lines)).toBe(15_000);
  });

  it('uses per-line vatRate when provided', () => {
    const lines = [
      { lineTotal: 110_000, vatRate: 10 }, // 10000
      { lineTotal: 109_000, vatRate: 9 },  // 9000
    ];
    expect(orderVat(lines)).toBe(19_000);
  });

  it('falls back to DEFAULT_VAT_RATE for null/undefined vatRate', () => {
    const lines = [
      { lineTotal: 110_000, vatRate: null },
      { lineTotal: 110_000, vatRate: undefined },
    ];
    expect(orderVat(lines)).toBe(20_000);
  });

  it('returns 0 for empty order', () => {
    expect(orderVat([])).toBe(0);
  });

  it('returns 0 for zero-total lines', () => {
    const lines = [{ lineTotal: 0 }, { lineTotal: 0 }];
    expect(orderVat(lines)).toBe(0);
  });
});
