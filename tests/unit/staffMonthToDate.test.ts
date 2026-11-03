import { describe, expect, it } from 'vitest';
import { computeMonthToDate, resolveBasis, tally } from '@/lib/staff-panel/monthToDate';
import type { StatementBasis } from '@/lib/staff-panel/statements';

const kitchen: StatementBasis = { model: 'hourly', agreedSalary: 20_800_000, standardHours: 208, hourlyRate: 100_000, overtimeMultiplier: 1.4, rounding: 1000 };
const hall: StatementBasis = { model: 'daily', agreedSalary: 24_000_000, baseDays: 24, dailyRate: 1_000_000, bonusEveryShifts: 6, rounding: 1000 };
const row = (d: string, h: number, status = 'confirmed', attendanceType = 'present') => ({ workDate: d, workedMinutes: h * 60, status, attendanceType });

describe('month to date', () => {
  it('counts distinct work days and skips absences', () => {
    expect(tally([row('2026-10-23', 8), row('2026-10-23', 8), row('2026-10-24', 0, 'confirmed', 'absent')])).toEqual({ minutes: 960, days: 1 });
  });

  it('kitchen: full fixed salary, no overtime under 208 hours, pending shown separately', () => {
    const m = computeMonthToDate(kitchen, [row('2026-10-23', 100), row('2026-10-24', 8, 'draft')]);
    expect(m.confirmed.total).toBe(20_800_000);
    expect(m.confirmed.hoursToOvertime).toBe(108);
    expect(m.withPending.minutes).toBe(108 * 60);
    expect(m.confirmed.lines.map((l) => l.label)).toEqual(['حقوق ثابت ماه']);
  });

  it('kitchen: overtime above 208 hours at 1.4×', () => {
    const m = computeMonthToDate(kitchen, [row('2026-10-23', 218)]);
    expect(m.confirmed.total).toBe(20_800_000 + 1_400_000);
    expect(m.confirmed.hoursToOvertime).toBe(0);
  });

  it('hall: days present plus one bonus day per 6', () => {
    const rows = Array.from({ length: 6 }, (_, i) => row(`2026-10-${23 + i}`, 8));
    const m = computeMonthToDate(hall, rows);
    expect(m.confirmed.days).toBe(6);
    expect(m.confirmed.paidDays).toBe(7);
    expect(m.confirmed.total).toBe(7_000_000);
  });

  it('basis: latest statement wins, else from the employee record, else none', () => {
    expect(resolveBasis({ latestStatementBasis: hall, section: 'آشپزخانه' })).toBe(hall);
    expect(resolveBasis({ section: 'آشپزخانه', hourlyRate: 100_000 })?.agreedSalary).toBe(20_800_000);
    expect(resolveBasis({ section: 'سالن', baseMonthlySalary: 24_000_000 })?.model).toBe('daily');
    expect(resolveBasis({ section: 'سالن' })).toBeNull();
  });
});
