import { describe, it, expect } from 'vitest';
import {
  computeHourlyStatement, computeDailyStatement, describeBasis, roundTo, shiftCodeHours,
} from '@/lib/staff-panel/statements';

// اعداد زیر از رسیدهای واریز بانکی مهر ۱۴۰۵ (ریال ÷ ۱۰) و اکسل‌های حقوق صفاسیتی گرفته شده‌اند.
describe('حقوق ساعتی (آشپزخانه) — مطابق رسیدهای واریز مهر ۱۴۰۵', () => {
  const cases: Array<[string, number, number[], number]> = [
    ['۳۰ میلیون، ۲۲۲ ساعت', 30_000_000, [24, 64, 56, 47, 31], 2_827_000],
    ['۲۸ میلیون، ۳۴۴ ساعت', 28_000_000, [48, 88, 80, 72, 56], 25_631_000],
    ['۲۸ میلیون، ۲۳۲ ساعت', 28_000_000, [24, 48, 48, 48, 64], 4_523_000],
    ['۲۸ میلیون، ۲۴۸ ساعت', 28_000_000, [24, 48, 64, 56, 56], 7_538_000],
    ['۲۹ میلیون، ۲۲۴ ساعت', 29_000_000, [24, 48, 48, 64, 40], 3_123_000],
  ];
  for (const [name, salary, weeks, overtime] of cases) {
    it(`اضافه‌کاری ${name} = ${overtime.toLocaleString('en-US')} تومان`, () => {
      const s = computeHourlyStatement({ agreedSalary: salary, weeklyHours: weeks });
      expect(s.overtimePay).toBe(overtime);
      expect(s.basePay).toBe(salary);
      expect(s.total).toBe(salary + overtime);
    });
  }

  it('دقیقاً ۲۰۸ ساعت → بدون اضافه‌کاری', () => {
    const s = computeHourlyStatement({ agreedSalary: 30_000_000, weeklyHours: [32, 48, 48, 48, 32] });
    expect(s.totalHours).toBe(208);
    expect(s.overtimeHours).toBe(0);
    expect(s.lines.map((l) => l.label)).toEqual(['حقوق ثابت ماه']);
  });

  it('کمتر از ۲۰۸ ساعت → حقوق ثابت کامل (مثل مهر) و یادداشت', () => {
    const s = computeHourlyStatement({ agreedSalary: 29_000_000, weeklyHours: [24, 48, 48, 32, 40] });
    expect(s.totalHours).toBe(192);
    expect(s.total).toBe(29_000_000);
    expect(s.notes[0]).toContain('کمتر از 208');
  });

  it('نرخ ساعتی = حقوق ÷ ۲۰۸', () => {
    expect(computeHourlyStatement({ agreedSalary: 30_000_000, weeklyHours: [208] }).basis.hourlyRate).toBe(144231);
  });
});

describe('حقوق روزانه (سالن) — مطابق واریز مهر ۱۴۰۵', () => {
  const cases: Array<[number, number, number, number]> = [
    // حقوق، روز حضور، روز محاسبه‌شده، مبلغ
    [28_000_000, 13, 15, 17_500_000],
    [26_000_000, 11, 12, 13_000_000],
    [27_000_000, 12, 14, 15_750_000],
    [26_000_000, 10, 11, 11_917_000],
    [27_000_000, 6, 7, 7_875_000],
  ];
  for (const [salary, present, paidDays, amount] of cases) {
    it(`${present} روز حضور → ${paidDays} روز → ${amount.toLocaleString('en-US')}`, () => {
      const s = computeDailyStatement({ agreedSalary: salary, presentDays: present });
      expect(s.paidDays).toBe(paidDays);
      expect(s.total).toBe(amount);
    });
  }
  it('حقوق کامل', () => {
    const s = computeDailyStatement({ agreedSalary: 30_000_000, presentDays: null, fullSalary: true });
    expect(s.total).toBe(30_000_000);
    expect(s.basis.fullSalary).toBe(true);
  });
  it('خطوط جمع می‌شوند به مبلغ نهایی', () => {
    const s = computeDailyStatement({ agreedSalary: 26_000_000, presentDays: 10 });
    expect(s.lines.reduce((a, l) => a + l.amount, 0)).toBe(s.total);
  });
});

describe('توضیح مبنا و کد شیفت', () => {
  it('توضیح ساعتی شامل ۲۰۸، نرخ ساعتی و ۱٫۴ است', () => {
    const txt = describeBasis(computeHourlyStatement({ agreedSalary: 30_000_000, weeklyHours: [208] }).basis).join(' ');
    expect(txt).toContain('208');
    expect(txt).toContain('144,231');
    expect(txt).toContain('1.4');
    expect(txt).toContain('1,000');
  });
  it('توضیح روزانه شامل ÷۲۴ و ۶ شیفت', () => {
    const txt = describeBasis(computeDailyStatement({ agreedSalary: 27_000_000, presentDays: 12 }).basis).join(' ');
    expect(txt).toContain('24');
    expect(txt).toContain('6 شیفت');
  });
  it('ساعت کد شیفت', () => {
    expect(shiftCodeHours('صبح+شب')).toBe(16);
    expect(shiftCodeHours('صبح')).toBe(8);
    expect(shiftCodeHours('کوتاه')).toBe(5);
    expect(shiftCodeHours('آف')).toBe(0);
    expect(shiftCodeHours('نامعلوم')).toBeNull();
  });
  it('گرد کردن', () => {
    expect(roundTo(2_826_923.08)).toBe(2_827_000);
    expect(roundTo(11_916_666.7)).toBe(11_917_000);
    expect(roundTo(500)).toBe(1000);
  });
});

import {
  parseSalaries, parseWeeklyHours, parseDailyTable, buildDays, matchShortName, buildStatements, buildSql, parseArgs,
} from '@/scripts/staff-statements-sql';

describe('اسکریپت ساخت SQL ریز کارکرد (بدون اتصال به دیتابیس)', () => {
  const kitchen = [['نام', 'حقوق'], ['علی رضایی', 30_000_000], ['جمع', '']];
  const hall = [['نام', 'حقوق', 'روز'], ['مریم احمدی', 26_000_000, 10], ['نفر ویژه', 30_000_000, 'حقوق کامل']];
  const hoursRows = [['نام', '۱-۳ مهر', '۵-۱۰', 'جمع ساعت'], ['علی رضایی', 24, 88, 112], ['هر شیفت ۸ ساعت …']];
  const dailyRows = [['نام', 'هفته', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'],
    ['علی', '۱-۳ مهر', 'آف', 'آف', 'آف', 'صبح+شب', 'صبح', 'آف'],
    ['علی', '۵-۱۰', 'شب', 'صبح+شب', 'صبح+شب', 'صبح+شب', 'صبح+شب', 'صبح+شب']];

  it('حقوق‌ها و ساعت‌ها خوانده می‌شود (ردیف جمع و توضیح رد می‌شود)', () => {
    const s = parseSalaries(kitchen, hall);
    expect(s.kitchen).toEqual([{ name: 'علی رضایی', salary: 30_000_000 }]);
    expect(s.hall[0]).toMatchObject({ name: 'مریم احمدی', presentDays: 10, fullSalary: false });
    expect(s.hall[1]).toMatchObject({ name: 'نفر ویژه', fullSalary: true });
    const h = parseWeeklyHours(hoursRows);
    expect(h.labels).toEqual(['۱-۳ مهر', '۵-۱۰']);
    expect(h.byName.get('علی رضایی')).toEqual({ hours: [24, 88], total: 112 });
    expect(h.byName.size).toBe(1);
  });

  it('نام کوتاه با نام کامل جور می‌شود', () => {
    expect(matchShortName('امیر', 'امیرمحمد خرسندیان')).toBe(true);
    expect(matchShortName('صدرا', 'کریم ناطقیان (صدرا)')).toBe(true);
    expect(matchShortName('کیمیا', 'سجاد موسولی')).toBe(false);
  });

  it('روزها: چهارشنبه ۱ مهر → شماره‌ی روز؛ جمعه‌ی آخر به ماه بعد می‌افتد', () => {
    const w1 = buildDays(['آف', 'آف', 'آف', 'صبح+شب', 'صبح', 'آف'], 0, -2, 30);
    expect(w1.map((d) => d.date)).toEqual([null, null, null, 1, 2, 3]);
    expect(w1[3]).toMatchObject({ weekday: 'چهارشنبه', hours: 16 });
    const w5 = buildDays(['صبح', 'صبح', 'صبح', 'صبح', 'صبح', 'آف'], 4, -2, 30);
    expect(w5.map((d) => d.date)).toEqual([26, 27, 28, 29, 30, null]);
  });

  it('ساخت ریز کارکرد: جمع روزها با ساعت هفته می‌خواند؛ حقوق کامل بدون محاسبه', () => {
    const people = buildStatements({
      period: '1405-07', periodTitle: 'مهر ۱۴۰۵', firstSundayOffset: -2, daysInMonth: 30,
      salaries: parseSalaries(kitchen, hall), hours: parseWeeklyHours(hoursRows), daily: parseDailyTable(dailyRows),
      hallDays: new Map([['مریم احمدی', { present: 10, paidDays: 11, amount: 11_917_000 }]]),
    });
    const ali = people.find((p) => p.name === 'علی رضایی')!;
    expect(ali.warnings).toEqual([]);
    expect(ali.total).toBe(30_000_000);
    expect((ali.weeks as any[])[0].days.length).toBe(6);
    expect(people.find((p) => p.name === 'مریم احمدی')!.total).toBe(11_917_000);
    expect(people.find((p) => p.name === 'نفر ویژه')!.total).toBe(30_000_000);
  });

  it('اگر جمع روزها با ساعت هفته نخواند، هشدار می‌دهد', () => {
    const bad = parseWeeklyHours([['نام', '۱-۳ مهر', 'جمع ساعت'], ['علی رضایی', 99, 99]]);
    const people = buildStatements({
      period: '1405-07', periodTitle: 'x', firstSundayOffset: -2, daysInMonth: 30,
      salaries: parseSalaries(kitchen, []), hours: bad, daily: parseDailyTable(dailyRows), hallDays: new Map(),
    });
    expect(people[0]!.warnings.join(' ')).toContain('نمی‌خواند');
  });

  it('SQL: نفر پیدا‌نشده رد می‌شود (NOTICE)، اجرای دوباره امن، نقل‌قول امن', () => {
    const people = buildStatements({
      period: '1405-07', periodTitle: 'مهر ۱۴۰۵', firstSundayOffset: -2, daysInMonth: 30,
      salaries: parseSalaries([['نام', 'ح'], ["او'کانر کلبادی‌نژاد", 29_000_000]], []), hours: parseWeeklyHours([['نام', '۱-۳ مهر', 'جمع ساعت'], ["او'کانر کلبادی‌نژاد", 24, 24]]),
      daily: new Map(), hallDays: new Map(),
    });
    const sql = buildSql('1405-07', people, 'file.xlsx');
    expect(sql).toContain('ON CONFLICT (employee_id, period_year_month) DO UPDATE');
    expect(sql).toContain('IF n = 1 THEN');
    expect(sql).toContain('RAISE NOTICE');
    expect(sql).toContain("ILIKE '%او''کانر%'");
    expect(sql).toContain("ILIKE '%کلبادی%'"); // پسوند بعد از نیم‌فاصله حذف می‌شود
    expect(sql).toContain('BEGIN;');
    expect(sql).toContain('COMMIT;');
  });

  it('آرگومان‌ها', () => {
    expect(parseArgs(['--salaries', 'a.xlsx', '--detail', 'b.xlsx', '--period', '1405-07'])).toEqual({ salaries: 'a.xlsx', detail: 'b.xlsx', period: '1405-07', out: undefined });
  });
});
