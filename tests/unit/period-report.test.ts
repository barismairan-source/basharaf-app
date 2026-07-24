/**
 * lib/reports/periodResolve.ts — تست منطق خالص انتخاب بازه‌ی داشبورد
 * (resolvePeriod/previousPeriod). بدون DB — این دو تابع فقط روی تاریخ
 * کار می‌کنند (و به همین دلیل هم در API route هم در کامپوننت 'use client'
 * قابل import هستند — برخلاف periodReport.ts که db client را import
 * می‌کند و فقط سمت سرور امن است).
 *
 * پوشش:
 *  ۱. today/7d/30d نسبت به «امروز» واقعی درست حل می‌شوند.
 *  ۲. custom معتبر/نامعتبر (from>to، فرمت غلط، خالی) — null یعنی «قابل محاسبه نیست»،
 *     نه یک حدس نادرست.
 *  ۳. previousPeriod: بازه‌ی هم‌طولِ بلافاصله قبل، بدون هم‌پوشانی با بازه‌ی فعلی.
 */
import { describe, it, expect } from 'vitest';
import { resolvePeriod, previousPeriod } from '@/lib/reports/periodResolve';
import { getTodayJalali, jalaliToDate } from '@/lib/jalali';

const today = getTodayJalali();

describe('resolvePeriod — today/7d/30d', () => {
  it('today → from=to=امروز، طول ۱ روز', () => {
    const r = resolvePeriod('today');
    expect(r).not.toBeNull();
    expect(r!.fromJalali).toBe(today);
    expect(r!.toJalali).toBe(today);
    expect(r!.lengthDays).toBe(1);
  });

  it('7d → طول دقیقاً ۷ روز، پایان = امروز', () => {
    const r = resolvePeriod('7d');
    expect(r).not.toBeNull();
    expect(r!.toJalali).toBe(today);
    expect(r!.lengthDays).toBe(7);
    const from = jalaliToDate(r!.fromJalali)!;
    const to = jalaliToDate(r!.toJalali)!;
    const diffDays = Math.round((to.getTime() - from.getTime()) / 86_400_000);
    expect(diffDays).toBe(6); // ۷ روز شامل هر دو سر = ۶ روز فاصله
  });

  it('30d → طول دقیقاً ۳۰ روز', () => {
    const r = resolvePeriod('30d');
    expect(r!.lengthDays).toBe(30);
    expect(r!.toJalali).toBe(today);
  });
});

describe('resolvePeriod — custom', () => {
  it('بازه‌ی معتبر (from < to) → طول درست محاسبه می‌شود', () => {
    const r = resolvePeriod('custom', '۱۴۰۵/۰۱/۰۱', '۱۴۰۵/۰۱/۱۰');
    expect(r).not.toBeNull();
    expect(r!.lengthDays).toBe(10);
  });

  it('from برابر to → طول ۱ روز (معتبر، نه خطا)', () => {
    const r = resolvePeriod('custom', '۱۴۰۵/۰۱/۰۵', '۱۴۰۵/۰۱/۰۵');
    expect(r).not.toBeNull();
    expect(r!.lengthDays).toBe(1);
  });

  it('from بعد از to → null', () => {
    const r = resolvePeriod('custom', '۱۴۰۵/۰۲/۰۱', '۱۴۰۵/۰۱/۰۱');
    expect(r).toBeNull();
  });

  it('from یا to خالی → null', () => {
    expect(resolvePeriod('custom', undefined, '۱۴۰۵/۰۱/۱۰')).toBeNull();
    expect(resolvePeriod('custom', '۱۴۰۵/۰۱/۰۱', undefined)).toBeNull();
    expect(resolvePeriod('custom', null, null)).toBeNull();
  });

  it('فرمت نامعتبر → null (نه throw)', () => {
    expect(() => resolvePeriod('custom', 'not-a-date', '۱۴۰۵/۰۱/۱۰')).not.toThrow();
    expect(resolvePeriod('custom', 'not-a-date', '۱۴۰۵/۰۱/۱۰')).toBeNull();
  });
});

describe('previousPeriod — بازه‌ی هم‌طول قبلی، بدون هم‌پوشانی', () => {
  it('برای period=today، بازه‌ی قبلی دقیقاً «دیروز» است', () => {
    const current = resolvePeriod('today')!;
    const prev = previousPeriod(current);
    expect(prev).not.toBeNull();
    expect(prev!.lengthDays).toBe(1);
    // دیروز = یک روز قبل از امروز، پس فاصله‌ی from/to فعلی و قبلی باید ۱ روز باشد
    const currentFrom = jalaliToDate(current.fromJalali)!;
    const prevTo = jalaliToDate(prev!.toJalali)!;
    const diff = Math.round((currentFrom.getTime() - prevTo.getTime()) / 86_400_000);
    expect(diff).toBe(1);
  });

  it('برای بازه‌ی ۷روزه، بازه‌ی قبلی هم ۷ روز و بلافاصله قبل از آن است (بدون هم‌پوشانی)', () => {
    const current = resolvePeriod('7d')!;
    const prev = previousPeriod(current)!;
    expect(prev.lengthDays).toBe(current.lengthDays);

    const currentFrom = jalaliToDate(current.fromJalali)!;
    const prevTo = jalaliToDate(prev.toJalali)!;
    const diff = Math.round((currentFrom.getTime() - prevTo.getTime()) / 86_400_000);
    expect(diff).toBe(1); // prev.to دقیقاً یک روز قبل از current.from — بدون هم‌پوشانی، بدون شکاف
  });

  it('برای بازه‌ی سفارشی نامتقارن (۵ روزه)، طول بازه‌ی قبلی هم ۵ روز است', () => {
    const current = resolvePeriod('custom', '۱۴۰۵/۰۱/۱۰', '۱۴۰۵/۰۱/۱۴')!; // ۵ روز
    expect(current.lengthDays).toBe(5);
    const prev = previousPeriod(current)!;
    expect(prev.lengthDays).toBe(5);
    expect(prev.toJalali).toBe('۱۴۰۵/۰۱/۰۹');
    expect(prev.fromJalali).toBe('۱۴۰۵/۰۱/۰۵');
  });
});
