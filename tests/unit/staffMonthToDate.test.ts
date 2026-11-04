import { describe, expect, it } from 'vitest';
import { computeMonthToDate, describePayStructure, hourlyRateForBasis, resolveBasis, settingsToBasis, tally } from '@/lib/staff-panel/monthToDate';
import { shiftCellLabel, shiftsToCopy } from '@/lib/hr/shiftPresets';
import { shiftRangesOverlap } from '@/lib/payroll/attendanceEngine';
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

describe('pay structure and settings', () => {
  it('shows fixed pay and overtime rate separately for kitchen', () => {
    const rows = describePayStructure(kitchen);
    expect(rows[0]).toEqual({ label: 'حقوق ثابت ماهانه', value: '20,800,000 تومان' });
    expect(rows.find((r) => r.label.startsWith('اضافه‌کاری'))?.value).toContain('140,000 تومان');
  });
  it('shows the daily amount for hall', () => {
    expect(describePayStructure(hall)[1]?.value).toContain('1,000,000 تومان');
  });
  it('manager settings win over the statement, and give the clock an hourly rate', () => {
    const s = settingsToBasis({ model: 'hourly', agreedSalary: 41_600_000, standardHours: 208, overtimeMultiplier: '1.50', baseDays: 24, bonusEveryShifts: 6, fullSalary: false });
    expect(resolveBasis({ settingsBasis: s, latestStatementBasis: kitchen, section: 'آشپزخانه' })).toBe(s);
    expect(s.overtimeMultiplier).toBe(1.5);
    expect(hourlyRateForBasis(s)).toBe(200_000);
    expect(hourlyRateForBasis(hall)).toBe(125_000);
  });
});

describe('copying shifts from last week', () => {
  const s = (employeeId: string, workDate: string) => ({ employeeId, workDate, plannedStartTime: '10:00', plannedEndTime: '17:00' });
  it('moves shifts 7 days ahead and skips ones that already exist', () => {
    const out = shiftsToCopy([s('a', '2026-11-01'), s('b', '2026-11-02')], [s('a', '2026-11-08')]);
    expect(out.map((x) => [x.employeeId, x.targetDate])).toEqual([['b', '2026-11-09']]);
  });
  it('labels preset shifts by name and others by time', () => {
    expect(shiftCellLabel('17:00', '00:30')).toBe('شب');
    expect(shiftCellLabel('12:00', '17:00')).toBe('12:00–17:00');
  });
  it('morning and night on one day do not overlap', () => {
    expect(shiftRangesOverlap('10:00', '17:00', false, '17:00', '00:30', true)).toBe(false);
  });
});
