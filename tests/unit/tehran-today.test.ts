/**
 * «امروز» سمت سرور به وقت تهران (گزارش بررسی ۲۰۲۶-۱۰، یافته‌ی M3):
 * سرور لیارا احتمالاً UTC است؛ از ۰۰:۰۰ تا ۰۳:۳۰ تهران «امروز» روز قبل حساب می‌شد.
 */
import { describe, it, expect } from 'vitest';
import { getTodayJalali, todayIsoTehran } from '@/lib/jalali';

describe('امروزِ تهران مستقل از timezone سرور', () => {
  // ۵ اکتبر ۲۰۲۶ ساعت ۰۱:۰۰ تهران = ۴ اکتبر ۲۱:۳۰ UTC
  const afterMidnightTehran = new Date('2026-10-04T21:30:00Z');

  it('تاریخ میلادی', () => {
    expect(todayIsoTehran(afterMidnightTehran)).toBe('2026-10-05');
  });
  it('تاریخ شمسی (۱۳ مهر ۱۴۰۵)', () => {
    expect(getTodayJalali(afterMidnightTehran)).toBe('۱۴۰۵/۰۷/۱۳');
  });
  it('قبل از نیمه‌شب تهران هنوز روز قبل است', () => {
    expect(getTodayJalali(new Date('2026-10-04T20:00:00Z'))).toBe('۱۴۰۵/۰۷/۱۲');
  });
});
