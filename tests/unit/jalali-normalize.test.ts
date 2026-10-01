/**
 * یکسان‌سازی تاریخ شمسی در مرز API (گزارش بررسی ۲۰۲۶-۱۰، یافته‌ی M2):
 * گزارش‌ها تاریخ را متنی مقایسه می‌کنند، پس هر تاریخ باید دقیقاً `۱۴۰۵/۰۲/۳۱` باشد.
 */
import { describe, it, expect } from 'vitest';
import { normalizeJalaliDate } from '@/lib/jalali';
import { jalaliDateField } from '@/lib/validations/jalaliDate';

describe('normalizeJalaliDate', () => {
  it.each([
    ['1405/3/6', '۱۴۰۵/۰۳/۰۶'],
    ['1405/03/06', '۱۴۰۵/۰۳/۰۶'],
    ['۱۴۰۵/۰۲/۳۱', '۱۴۰۵/۰۲/۳۱'],
    ['١٤٠٥/٠٢/٣١', '۱۴۰۵/۰۲/۳۱'],
    ['1405-12-30', '۱۴۰۵/۱۲/۳۰'],
    ['  1405/1/1  ', '۱۴۰۵/۰۱/۰۱'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeJalaliDate(input)).toBe(expected);
  });

  it.each(['1405/13/01', '1405/07/31', '1405/00/10', '2026/01/01', 'abc', '', '1405/02'])(
    '%s → null',
    (input) => {
      expect(normalizeJalaliDate(input)).toBeNull();
    },
  );

  it('ترتیب متنی تاریخ‌های یکسان‌شده با ترتیب زمانی برابر است', () => {
    const dates = ['1405/10/1', '1405/2/15', '1405/02/3'].map((d) => normalizeJalaliDate(d)!);
    expect([...dates].sort()).toEqual(['۱۴۰۵/۰۲/۰۳', '۱۴۰۵/۰۲/۱۵', '۱۴۰۵/۱۰/۰۱']);
  });
});

describe('jalaliDateField (zod)', () => {
  it('ورودی معتبر را یکسان می‌کند', () => {
    expect(jalaliDateField.parse('1405/3/6')).toBe('۱۴۰۵/۰۳/۰۶');
  });
  it('ورودی نامعتبر را رد می‌کند', () => {
    expect(jalaliDateField.safeParse('hello').success).toBe(false);
  });
});
