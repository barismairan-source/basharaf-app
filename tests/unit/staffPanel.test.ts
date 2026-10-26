import { describe, it, expect } from 'vitest';
import {
  maskTail, isPayslipVisibleToStaff, isValidPeriod, summarizeAttendance, shiftPeriod, toLatinDigits, periodLabel, formatMinutes,
} from '@/lib/staff-panel/pure';
import { isPublicPath } from '@/lib/auth/sessionExpiry';

describe('پنل پرسنل — کمک‌های خالص', () => {
  it('ماسک: فقط ۴ رقم آخر؛ کوتاه‌ها کامل ستاره', () => {
    expect(maskTail('IR660170000000122394357002')).toBe('*'.repeat(22) + '7002');
    expect(maskTail('1234567890')).toBe('******7890');
    expect(maskTail('1234')).toBe('****');
    expect(maskTail('12 34 56 78 90')).toBe('******7890');
    expect(maskTail(null)).toBeNull();
    expect(maskTail('')).toBeNull();
  });

  it('فیش فقط بعد از تأیید مدیر دیده می‌شود (نه پیش‌نویس/محاسبه‌شده)', () => {
    expect(isPayslipVisibleToStaff('approved')).toBe(true);
    expect(isPayslipVisibleToStaff('posted')).toBe(true);
    expect(isPayslipVisibleToStaff('draft')).toBe(false);
    expect(isPayslipVisibleToStaff('calculated')).toBe(false);
  });

  it('دوره‌ی شمسی', () => {
    expect(isValidPeriod('1405-07')).toBe(true);
    expect(isValidPeriod('1405-13')).toBe(false);
    expect(isValidPeriod('1405-7')).toBe(false);
    expect(isValidPeriod("1405-07'; drop")).toBe(false);
    expect(isValidPeriod(null)).toBe(false);
    expect(shiftPeriod('1405-01', -1)).toBe('1404-12');
    expect(shiftPeriod('1405-12', 1)).toBe('1406-01');
    expect(shiftPeriod('1405-07', 0)).toBe('1405-07');
    expect(toLatinDigits('۱۴۰۵/۰۷/۰۳')).toBe('1405/07/03');
    expect(periodLabel('1405-07')).toBe('مهر 1405');
  });

  it('جمع حضور: تأییدشده جدا از پیش‌نویس؛ مرخصی/غیبت جزو حضور نیست', () => {
    const s = summarizeAttendance([
      { status: 'confirmed', attendanceType: 'present', workedMinutes: 480 },
      { status: 'locked', attendanceType: 'holiday_work', workedMinutes: 300 },
      { status: 'draft', attendanceType: 'present', workedMinutes: 240 },
      { status: 'confirmed', attendanceType: 'paid_leave', workedMinutes: 480 },
      { status: 'confirmed', attendanceType: 'absent', workedMinutes: 0 },
    ]);
    expect(s).toEqual({ confirmedMinutes: 780, pendingMinutes: 240, days: 3 });
  });

  it('نمایش ساعت', () => {
    expect(formatMinutes(480)).toBe('8 ساعت');
    expect(formatMinutes(495)).toBe('8 ساعت و 15 دقیقه');
  });

  it('/me عمومی است ولی /menu و /message نه', () => {
    expect(isPublicPath('/me')).toBe(true);
    expect(isPublicPath('/me/anything')).toBe(true);
    expect(isPublicPath('/menu')).toBe(false);
    expect(isPublicPath('/message')).toBe(false);
  });
});

import { normalizePhone, parseStaff, buildSql, sqlStr } from '@/scripts/staff-import-sql';

describe('وارد کردن پرسنل — ساخت SQL (بدون اتصال به دیتابیس)', () => {
  it('تلفن: ارقام فارسی، فاصله، +98 → ۰۹…؛ نامعتبر → null', () => {
    expect(normalizePhone('09121234567')).toBe('09121234567');
    expect(normalizePhone('۰۹۱۲ ۱۲۳ ۴۵۶۷')).toBe('09121234567');
    expect(normalizePhone('+98 912 123 4567')).toBe('09121234567');
    expect(normalizePhone('ندارد — فقط شماره «زهرا» را داده')).toBeNull();
    expect(normalizePhone('—')).toBeNull();
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone('02112345678')).toBeNull();
  });

  it('ردیف: نام کامل اول، بعد نام رایج؛ بدون نام رد می‌شود؛ بخش → سمت', () => {
    const rows = parseStaff([
      { 'نام کامل (کارت ملی)': 'علی رضایی', 'نام رایج': 'علی', 'بخش': 'سالن', 'تلفن': '09121234567', 'کد ملی': '0012345678', 'شماره شبا': 'IR000' },
      { 'نام کامل (کارت ملی)': '—', 'نام رایج': 'زهرا', 'بخش': 'آشپزخانه', 'تلفن': '' },
      { 'نام کامل (کارت ملی)': '', 'نام رایج': '', 'بخش': 'سالن' },
      { 'نام کامل (کارت ملی)': 'نفر سوم', 'بخش': '—' },
    ]);
    expect(rows).toEqual([
      { fullName: 'علی رضایی', role: 'waiter', phone: '09121234567' },
      { fullName: 'زهرا', role: 'cook', phone: null },
      { fullName: 'نفر سوم', role: 'other', phone: null },
    ]);
  });

  it('SQL: کد ملی/شبا/کارت هرگز نمی‌آید؛ تکراری‌ساز نیست؛ نقل‌قول امن است', () => {
    const rows = parseStaff([{ 'نام کامل (کارت ملی)': "او'کانر", 'بخش': 'سالن', 'تلفن': '09121234567', 'کد ملی': '0012345678', 'شماره شبا': 'IR000111', 'شماره کارت': '6037000011112222' }]);
    const sql = buildSql(rows, "شعبه 'الف'");
    expect(sql).not.toMatch(/0012345678|IR000111|6037000011112222/);
    expect(sql).toContain("WHERE NOT EXISTS (SELECT 1 FROM employees WHERE full_name = 'او''کانر')");
    expect(sql).toContain("SELECT id FROM branches WHERE name = 'شعبه ''الف'''");
    expect(sql.startsWith('--')).toBe(true);
    expect(sql).toContain('BEGIN;');
    expect(sql).toContain('COMMIT;');
    expect(sqlStr("a'b")).toBe("'a''b'");
  });
});
