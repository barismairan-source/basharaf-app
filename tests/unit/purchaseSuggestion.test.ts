import { describe, it, expect } from 'vitest';
import { computeSuggestion, coverageDaysForCycle } from '@/lib/inventory/purchaseSuggestion';

describe('coverageDaysForCycle', () => {
  it('daily items get a short coverage window', () => {
    expect(coverageDaysForCycle('daily')).toBe(2);
  });
  it('weekly items get a longer coverage window', () => {
    expect(coverageDaysForCycle('weekly')).toBe(8);
  });
});

describe('computeSuggestion', () => {
  it('falls back to the min-stock deficit when there is no consumption history (new item)', () => {
    const r = computeSuggestion({
      qtyPhysical: 2, minBase: 10, countCycle: 'weekly', totalConsumedBase: 0, lookbackDays: 28,
    });
    expect(r.suggestedBase).toBe(8); // 10 - 2
    expect(r.avgDailyConsumption).toBe(0);
    expect(r.demandDriven).toBe(false);
  });

  it('uses the demand-based quantity when it exceeds the min-stock deficit', () => {
    // مصرف روزانه واقعی ۵ واحد، پوشش هفتگی ۸ روز => نیاز ۴۰ واحد، منهای موجودی ۲ = ۳۸
    // در حالی که کمبود تا حداقل فقط ۸ واحد است — سیگنال مصرف باید غالب شود
    const r = computeSuggestion({
      qtyPhysical: 2, minBase: 10, countCycle: 'weekly', totalConsumedBase: 140, lookbackDays: 28,
    });
    expect(r.avgDailyConsumption).toBe(5);
    expect(r.suggestedBase).toBe(38);
    expect(r.demandDriven).toBe(true);
  });

  it('never suggests less than the min-stock deficit even with low consumption', () => {
    const r = computeSuggestion({
      qtyPhysical: 2, minBase: 10, countCycle: 'daily', totalConsumedBase: 2, lookbackDays: 28,
    });
    // avgDaily = 2/28 ≈ 0.071؛ demandBase = 0.071*2 - 2 که منفی است => سیگنال حداقل موجودی باید ببرد
    expect(r.suggestedBase).toBe(8);
    expect(r.demandDriven).toBe(false);
  });

  it('daily items need a much shorter runway than weekly items for the same consumption rate', () => {
    const daily = computeSuggestion({
      qtyPhysical: 0, minBase: 1, countCycle: 'daily', totalConsumedBase: 280, lookbackDays: 28,
    });
    const weekly = computeSuggestion({
      qtyPhysical: 0, minBase: 1, countCycle: 'weekly', totalConsumedBase: 280, lookbackDays: 28,
    });
    // میانگین روزانه هر دو ۱۰ است؛ روزانه پوشش ۲ روز (۲۰)، هفتگی پوشش ۸ روز (۸۰)
    expect(daily.suggestedBase).toBe(20);
    expect(weekly.suggestedBase).toBe(80);
  });
});
