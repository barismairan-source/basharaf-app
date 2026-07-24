/**
 * lib/reports/metricSemantics.ts — تست معناشناسی معیارهای داشبورد.
 *
 * پوشش:
 *  ۱. computeAvgTicket: صفر فاکتور → null (نه ۰ تومان، نه NaN).
 *  ۲. isNothingHappenedToday: تشخیص دقیق حالت «واقعاً هیچ فعالیتی نبوده».
 *  ۳. computeChangePct: تقسیم بر صفر هرگز درصد ساختگی نمی‌سازد؛ null یعنی
 *     «داده‌ی قبلی موجود نیست»، نه صفر.
 */
import { describe, it, expect } from 'vitest';
import { computeAvgTicket, isNothingHappenedToday, computeChangePct } from '@/lib/reports/metricSemantics';

describe('computeAvgTicket — صفر فاکتور یعنی «قابل‌محاسبه نیست»، نه صفر تومان', () => {
  it('invoiceCount=0 → null (نه ۰، نه NaN)', () => {
    expect(computeAvgTicket(0, 0)).toBeNull();
    expect(computeAvgTicket(500_000, 0)).toBeNull(); // حتی اگر revenue>0 بود (داده‌ی ناسازگار)، همچنان null
  });

  it('invoiceCount>0 → میانگین صحیح، رند شده', () => {
    expect(computeAvgTicket(1_000_000, 4)).toBe(250_000);
    expect(computeAvgTicket(100, 3)).toBe(33); // رند به نزدیک‌ترین عدد صحیح
  });

  it('revenue=0 با invoiceCount>0 → صفر واقعی (نه null) — فاکتور صفرتومانی معتبر است', () => {
    expect(computeAvgTicket(0, 5)).toBe(0);
  });
});

describe('isNothingHappenedToday', () => {
  it('همه صفر → true', () => {
    expect(isNothingHappenedToday({ revenue: 0, invoiceCount: 0, cogs: 0, wasteTotal: 0 })).toBe(true);
  });

  it('فقط ضایعات غیرصفر → false (چیزی اتفاق افتاده)', () => {
    expect(isNothingHappenedToday({ revenue: 0, invoiceCount: 0, cogs: 0, wasteTotal: 50_000 })).toBe(false);
  });

  it('فروش واقعی → false', () => {
    expect(isNothingHappenedToday({ revenue: 500_000, invoiceCount: 2, cogs: 100_000, wasteTotal: 0 })).toBe(false);
  });
});

describe('computeChangePct — بدون درصد ساختگی از تقسیم بر صفر', () => {
  it('previous=null → null (داده‌ی دوره‌ی قبل اصلاً وجود ندارد)', () => {
    expect(computeChangePct(1000, null)).toBeNull();
  });

  it('previous=0 و current=0 → ۰٪ (بدون تغییر، واقعاً معنی دارد)', () => {
    expect(computeChangePct(0, 0)).toBe(0);
  });

  it('previous=0 و current≠0 → null (درصد از پایه‌ی صفر تعریف‌نشده است، نه بی‌نهایت ساختگی)', () => {
    expect(computeChangePct(500_000, 0)).toBeNull();
  });

  it('محاسبه‌ی عادی درصد افزایش', () => {
    expect(computeChangePct(1_100_000, 1_000_000)).toBe(10);
  });

  it('محاسبه‌ی عادی درصد کاهش', () => {
    expect(computeChangePct(800_000, 1_000_000)).toBe(-20);
  });

  it('previous منفی — از قدر مطلق برای مبنا استفاده می‌شود', () => {
    // previous=-100 → current=-50 یعنی بهبود ۵۰٪ (نزدیک‌تر به صفر)
    expect(computeChangePct(-50, -100)).toBe(50);
  });
});
