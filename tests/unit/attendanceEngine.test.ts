import { describe, it, expect } from 'vitest';
import {
  timeToMinutes, minutesToTime, minutesBetween, validateShiftMinutes,
  resolveTotalPresenceMinutes, applyBreakPolicy, splitRegularOvertime,
  deriveHolidayMinutes, resolveNightMinutes, resolveActiveHourlyRate,
  shiftRangesOverlap, calcAttendancePay, calculateHourlyPayslip,
  canEditAttendance, canConfirmAttendance, canLockAttendance, isPayableAttendanceStatus,
  findAttendanceOverlap,
  type AttendanceDayForPayslip, type AttendanceIntervalInput,
} from '@/lib/payroll/attendanceEngine';

const BASE_PARAMS = {
  overtimeMultiplier: 1.4,
  nightShiftPremium: 1.35,
  holidayMultiplier: 1.4,
  insuranceEmployeeRate: 0.07,
  insuranceEmployerRate: 0.23,
  taxBrackets: [{ upToMonthly: null, rate: 0 }],
};

function day(overrides: Partial<AttendanceDayForPayslip>): AttendanceDayForPayslip {
  return {
    workDate: '2026-05-01',
    plannedMinutes: 480,
    workedMinutes: 480,
    regularMinutes: 480,
    overtimeMinutes: 0,
    overtimeApproved: false,
    nightMinutes: 0,
    holidayMinutes: 0,
    hourlyRateSnapshot: 100_000,
    attendanceType: 'present',
    ...overrides,
  };
}

describe('۱. شیفت ۶ ساعته + حضور کامل', () => {
  it('regular=360, overtime=0', () => {
    const worked = minutesBetween('08:00', '14:00', false);
    expect(worked).toBe(360);
    const split = splitRegularOvertime(worked, 360);
    expect(split).toEqual({ regularMinutes: 360, overtimeMinutes: 0, shortfallMinutes: 0 });
  });
});

describe('۲. شیفت ۸ ساعته + حضور کامل', () => {
  it('regular=480, overtime=0', () => {
    const worked = minutesBetween('08:00', '16:00', false);
    const split = splitRegularOvertime(worked, 480);
    expect(split).toEqual({ regularMinutes: 480, overtimeMinutes: 0, shortfallMinutes: 0 });
  });
});

describe('۳. شیفت سفارشی ۴ ساعت و ۳۰ دقیقه', () => {
  it('270 دقیقه ذخیره می‌شود', () => {
    const mins = minutesBetween('09:00', '13:30', false);
    expect(mins).toBe(270);
    expect(validateShiftMinutes(mins)).toBe(true);
  });
});

describe('۴. تغییر دستی مدت فقط یک روز', () => {
  it('تفکیک فقط از روی plannedMinutes پاس‌داده‌شده انجام می‌شود (بدون وابستگی به قالب)', () => {
    // فرض: قالب پیش‌فرض ۸ ساعته (۴۸۰ دقیقه) است ولی برای این روز دستی به ۳۰۰ تغییر کرده
    const split = splitRegularOvertime(300, 300);
    expect(split.regularMinutes).toBe(300);
    expect(split.overtimeMinutes).toBe(0);
  });
});

describe('۵. تغییر قالب شیفت اثری روی تخصیص‌های گذشته ندارد', () => {
  it('splitRegularOvertime فقط ورودی صریح را می‌بیند، نه یک مرجع خارجی به قالب', () => {
    const pastAssignmentPlanned = 480; // snapshot زمان تخصیص
    const templateNowChangedTo = 360; // قالب بعداً تغییر کرده
    const split = splitRegularOvertime(480, pastAssignmentPlanned);
    expect(split.regularMinutes).toBe(480);
    expect(split.regularMinutes).not.toBe(templateNowChangedTo);
  });
});

describe('۶. حضور کمتر از شیفت برنامه‌ریزی‌شده', () => {
  it('کسری فقط گزارشی است، اضافه‌کاری صفر', () => {
    const split = splitRegularOvertime(300, 480);
    expect(split).toEqual({ regularMinutes: 300, overtimeMinutes: 0, shortfallMinutes: 180 });
  });
});

describe('۷. حضور بیشتر از شیفت برنامه‌ریزی‌شده', () => {
  it('اضافه‌کاری خام محاسبه می‌شود، حضور هرگز محدود نمی‌شود', () => {
    const split = splitRegularOvertime(540, 480);
    expect(split).toEqual({ regularMinutes: 480, overtimeMinutes: 60, shortfallMinutes: 0 });
  });
});

describe('۸. اضافه‌کاری تأییدشده وارد مبلغ می‌شود', () => {
  it('overtimePay > 0', () => {
    const days = [day({ overtimeMinutes: 60, overtimeApproved: true })];
    const result = calculateHourlyPayslip({ days, params: BASE_PARAMS, events: [] });
    expect(result.overtimeMinutesTotal).toBe(60);
    expect(result.overtimePendingMinutesTotal).toBe(0);
    const line = result.lines.find(l => l.code === 'overtime');
    expect(line?.amount).toBe(Math.round(60 * 100_000 * 1.4 / 60));
  });
});

describe('۹. اضافه‌کاری تأییدنشده وارد مبلغ نمی‌شود', () => {
  it('در pending می‌ماند', () => {
    const days = [day({ overtimeMinutes: 60, overtimeApproved: false })];
    const result = calculateHourlyPayslip({ days, params: BASE_PARAMS, events: [] });
    expect(result.overtimeMinutesTotal).toBe(0);
    expect(result.overtimePendingMinutesTotal).toBe(60);
    expect(result.lines.find(l => l.code === 'overtime')).toBeUndefined();
  });
});

describe('۱۰. شیفت عبور از نیمه‌شب', () => {
  it('ورود ۲۰:۰۰ خروج ۰۴:۰۰ → ۴۸۰ دقیقه', () => {
    expect(minutesBetween('20:00', '04:00', true)).toBe(480);
  });
  it('بدون crossesMidnight همان بازه نامعتبر است', () => {
    expect(() => minutesBetween('20:00', '04:00', false)).toThrow();
  });
});

describe('۱۱. استراحت با حقوق', () => {
  it('بدون کسر از حضور قابل‌پرداخت', () => {
    expect(applyBreakPolicy(480, 30, 'paid')).toBe(480);
    expect(applyBreakPolicy(480, 30, 'none')).toBe(480);
  });
});

describe('۱۲. استراحت بدون حقوق', () => {
  it('از حضور قابل‌پرداخت کسر می‌شود', () => {
    expect(applyBreakPolicy(480, 30, 'unpaid')).toBe(450);
  });
  it('استراحت بیشتر از حضور خام نامعتبر است', () => {
    expect(() => applyBreakPolicy(100, 200, 'unpaid')).toThrow();
  });
});

describe('۱۳. ورودی ساعت شروع/پایان (time_range)', () => {
  it('از روی ورود/خروج محاسبه می‌شود', () => {
    const mins = resolveTotalPresenceMinutes({ entryMode: 'time_range', clockIn: '08:00', clockOut: '16:00', crossesMidnight: false });
    expect(mins).toBe(480);
  });
});

describe('۱۴. ورودی مجموع دقیقه (total_minutes)', () => {
  it('مقدار دستی مستقیم استفاده می‌شود', () => {
    const mins = resolveTotalPresenceMinutes({ entryMode: 'total_minutes', manualWorkedMinutes: 375 });
    expect(mins).toBe(375);
  });
  it('خارج از بازه‌ی ۰..۱۴۴۰ نامعتبر است', () => {
    expect(() => resolveTotalPresenceMinutes({ entryMode: 'total_minutes', manualWorkedMinutes: 1500 })).toThrow();
  });
});

describe('۱۵. نرخ ساعتی متفاوت برای دو کارمند', () => {
  it('هر کارمند نرخ مستقل خودش را دارد', () => {
    const empA = [{ hourlyRate: 90_000, effectiveFrom: '2026-01-01', effectiveTo: null }];
    const empB = [{ hourlyRate: 120_000, effectiveFrom: '2026-01-01', effectiveTo: null }];
    expect(resolveActiveHourlyRate(empA, '2026-05-01')).toBe(90_000);
    expect(resolveActiveHourlyRate(empB, '2026-05-01')).toBe(120_000);
  });
});

describe('۱۶. تغییر نرخ میان‌ماه — بدون اثر روی گذشته', () => {
  const rates = [
    { hourlyRate: 90_000, effectiveFrom: '2026-01-01', effectiveTo: '2026-05-14' },
    { hourlyRate: 110_000, effectiveFrom: '2026-05-15', effectiveTo: null },
  ];
  it('روزهای قبل از تغییر با نرخ قدیمی', () => {
    expect(resolveActiveHourlyRate(rates, '2026-05-10')).toBe(90_000);
  });
  it('روزهای بعد از تغییر با نرخ جدید', () => {
    expect(resolveActiveHourlyRate(rates, '2026-05-20')).toBe(110_000);
  });
  it('فیش دوره با دو نرخ مختلف per-day جمع می‌شود', () => {
    const days = [
      day({ workDate: '2026-05-10', hourlyRateSnapshot: 90_000 }),
      day({ workDate: '2026-05-20', hourlyRateSnapshot: 110_000 }),
    ];
    const result = calculateHourlyPayslip({ days, params: BASE_PARAMS, events: [] });
    expect(result.ratesUsed.sort((a, b) => a - b)).toEqual([90_000, 110_000]);
    const expectedRegular = Math.round(480 * 90_000 / 60) + Math.round(480 * 110_000 / 60);
    expect(result.lines.find(l => l.code === 'base')?.amount).toBe(expectedRegular);
  });
});

describe('۱۷. مرخصی با حقوق', () => {
  it('دقیقه‌ی تأییدشده توسط مدیر پرداخت می‌شود، جدا از حضور واقعی', () => {
    const days = [day({ attendanceType: 'paid_leave', workedMinutes: 480, plannedMinutes: 0, regularMinutes: 0 })];
    const result = calculateHourlyPayslip({ days, params: BASE_PARAMS, events: [] });
    expect(result.paidLeaveMinutesTotal).toBe(480);
    expect(result.workedMinutesTotal).toBe(0);
    expect(result.lines.find(l => l.code === 'paid_leave')?.amount).toBe(Math.round(480 * 100_000 / 60));
  });
});

describe('۱۸. مرخصی بدون حقوق', () => {
  it('مبلغ پایه صفر، دقیقه فقط گزارشی', () => {
    const days = [day({ attendanceType: 'unpaid_leave', workedMinutes: 480 })];
    const result = calculateHourlyPayslip({ days, params: BASE_PARAMS, events: [] });
    expect(result.unpaidLeaveMinutesTotal).toBe(480);
    expect(result.grossEarnings).toBe(0);
  });
});

describe('۱۹. غیبت', () => {
  it('مبلغ صفر، دقیقه‌ی برنامه‌ریزی‌شده فقط برای گزارش', () => {
    const days = [day({ attendanceType: 'absent', plannedMinutes: 480, workedMinutes: 0 })];
    const result = calculateHourlyPayslip({ days, params: BASE_PARAMS, events: [] });
    expect(result.absentMinutesTotal).toBe(480);
    expect(result.grossEarnings).toBe(0);
  });
});

describe('۲۰. حضور بدون شیفت برنامه‌ریزی‌شده', () => {
  it('کل حضور حفظ می‌شود، به‌عنوان اضافه‌کاری پیشنهادی برای بررسی مدیر', () => {
    const split = splitRegularOvertime(300, 0);
    expect(split).toEqual({ regularMinutes: 0, overtimeMinutes: 300, shortfallMinutes: 0 });
  });
});

describe('۲۱. جلوگیری از هم‌پوشانی شیفت', () => {
  it('دو شیفت هم‌پوشان تشخیص داده می‌شود', () => {
    expect(shiftRangesOverlap('08:00', '16:00', false, '15:00', '20:00', false)).toBe(true);
  });
  it('دو شیفت غیرهم‌پوشان مجاز است', () => {
    expect(shiftRangesOverlap('08:00', '12:00', false, '13:00', '17:00', false)).toBe(false);
  });
  it('هم‌پوشانی با شیفت عبور از نیمه‌شب هم تشخیص داده می‌شود', () => {
    expect(shiftRangesOverlap('20:00', '04:00', true, '02:00', '06:00', false)).toBe(true);
  });
});

describe('۲۲. جلوگیری از ویرایش رکورد قفل‌شده', () => {
  it('locked قابل‌ویرایش نیست', () => {
    expect(canEditAttendance('locked')).toBe(false);
    expect(canEditAttendance('draft')).toBe(true);
    expect(canEditAttendance('confirmed')).toBe(true);
  });
});

describe('۲۳. جلوگیری از محاسبه‌ی draft', () => {
  it('فقط confirmed/locked وارد محاسبه می‌شود', () => {
    expect(isPayableAttendanceStatus('draft')).toBe(false);
    expect(isPayableAttendanceStatus('confirmed')).toBe(true);
    expect(isPayableAttendanceStatus('locked')).toBe(true);
  });
});

describe('۲۴. قفل‌شدن پس از نهایی‌شدن حقوق', () => {
  it('فقط confirmed قابل قفل‌شدن است', () => {
    expect(canLockAttendance('confirmed')).toBe(true);
    expect(canLockAttendance('draft')).toBe(false);
    expect(canLockAttendance('locked')).toBe(false);
  });
  it('فقط draft قابل تأییدشدن است', () => {
    expect(canConfirmAttendance('draft')).toBe(true);
    expect(canConfirmAttendance('confirmed')).toBe(false);
  });
});

describe('۲۵. جلوگیری از کسر دوگانه‌ی کم‌کاری', () => {
  it('کسری فقط گزارشی است و از مبلغ کم نمی‌شود', () => {
    const days = [day({ workedMinutes: 300, regularMinutes: 300, plannedMinutes: 480 })];
    const result = calculateHourlyPayslip({ days, params: BASE_PARAMS, events: [] });
    // فقط ۳۰۰ دقیقه واقعی پرداخت می‌شود؛ هیچ جریمه‌ی اضافه‌ای برای ۱۸۰ دقیقه‌ی کسری اعمال نمی‌شود
    expect(result.lines.find(l => l.code === 'base')?.amount).toBe(Math.round(300 * 100_000 / 60));
    expect(result.lines.find(l => l.code === 'penalty')).toBeUndefined();
  });
});

describe('۲۶–۲۷. idempotency ثبت حسابداری و reverse', () => {
  it('خارج از محدوده‌ی این موتور است — پوشش در lib/payroll/postToBasharaf.ts (بدون تغییر)', () => {
    expect(true).toBe(true);
  });
});

describe('شب‌کاری', () => {
  it('کل شیفت شب (۲۲:۰۰–۰۶:۰۰) شب‌کاری محسوب می‌شود', () => {
    expect(resolveNightMinutes('22:00', '06:00', true)).toBe(480);
  });
  it('شیفت روز هیچ دقیقه‌ی شبی ندارد', () => {
    expect(resolveNightMinutes('08:00', '16:00', false)).toBe(0);
  });
  it('همپوشانی جزئی با بازه‌ی شب محاسبه می‌شود', () => {
    // ۲۰:۰۰ تا ۰۴:۰۰ → همپوشانی با ۲۲:۰۰-۰۶:۰۰ برابر ۲۲:۰۰..۰۴:۰۰ = ۳۶۰ دقیقه
    expect(resolveNightMinutes('20:00', '04:00', true)).toBe(360);
  });
});

describe('تعطیل‌کاری/کار در روز مرخصی', () => {
  it('کل حضور به‌عنوان تعطیل‌کاری حساب می‌شود', () => {
    expect(deriveHolidayMinutes('holiday_work', 480)).toBe(480);
    expect(deriveHolidayMinutes('off_day_work', 300)).toBe(300);
    expect(deriveHolidayMinutes('present', 480)).toBe(0);
  });
});

describe('اعتبارسنجی‌های عمومی', () => {
  it('مدت شیفت باید >۰ و ≤۱۴۴۰ باشد', () => {
    expect(validateShiftMinutes(0)).toBe(false);
    expect(validateShiftMinutes(-10)).toBe(false);
    expect(validateShiftMinutes(1441)).toBe(false);
    expect(validateShiftMinutes(1)).toBe(true);
    expect(validateShiftMinutes(1440)).toBe(true);
  });
  it('حضور منفی رد می‌شود', () => {
    expect(() => applyBreakPolicy(-5, 0, 'unpaid')).toThrow();
    expect(() => splitRegularOvertime(-5, 100)).toThrow();
  });
  it('تبدیل رفت‌وبرگشت دقیقه↔ساعت', () => {
    expect(timeToMinutes('00:00')).toBe(0);
    expect(timeToMinutes('23:59')).toBe(1439);
    expect(minutesToTime(0)).toBe('00:00');
    expect(minutesToTime(1439)).toBe('23:59');
    expect(minutesToTime(1440)).toBe('00:00');
  });
});

describe('calcAttendancePay — فرمول‌های دقیق', () => {
  it('گردکردن فقط در یک نقطه انجام می‌شود', () => {
    const result = calcAttendancePay({
      regularMinutes: 100, overtimeMinutes: 50, nightMinutes: 30, holidayMinutes: 0,
      hourlyRate: 33_333, overtimeMultiplier: 1.4, nightMultiplier: 1.35, holidayMultiplier: 1.4,
    });
    expect(result.regularPay).toBe(Math.round(100 * 33_333 / 60));
    expect(result.overtimePay).toBe(Math.round(50 * 33_333 * 1.4 / 60));
    expect(result.nightPay).toBe(Math.round(30 * 33_333 * 1.35 / 60));
    expect(result.totalPay).toBe(result.regularPay + result.overtimePay + result.nightPay + result.holidayPay);
  });
});

describe('پاداش و مساعده در فیش ساعتی', () => {
  it('پاداش به ناخالص اضافه، مساعده از خالص کم می‌شود', () => {
    const days = [day({})];
    const result = calculateHourlyPayslip({
      days, params: BASE_PARAMS,
      events: [{ type: 'bonus', amount: 500_000 }, { type: 'advance', amount: 200_000 }],
    });
    expect(result.lines.find(l => l.code === 'bonus')?.amount).toBe(500_000);
    expect(result.lines.find(l => l.code === 'advance')?.amount).toBe(200_000);
    expect(result.netPay).toBeLessThan(result.grossEarnings);
  });
  it('اگر مساعده بیشتر از حقوق باشد isNegative=true', () => {
    const days = [day({ workedMinutes: 60, regularMinutes: 60, plannedMinutes: 60, hourlyRateSnapshot: 10_000 })];
    const result = calculateHourlyPayslip({ days, params: BASE_PARAMS, events: [{ type: 'advance', amount: 5_000_000 }] });
    expect(result.isNegative).toBe(true);
  });
});

function attEntry(overrides: Partial<AttendanceIntervalInput>): AttendanceIntervalInput {
  return {
    id: 'e1', attendanceType: 'present', entryMode: 'time_range',
    clockIn: '08:00', clockOut: '16:00', crossesMidnight: false,
    shiftAssignmentId: null,
    ...overrides,
  };
}

describe('جلوگیری از هم‌پوشانی حضور — findAttendanceOverlap', () => {
  it('دو رکورد با بازه‌ی زمانی هم‌پوشان تشخیص داده می‌شوند', () => {
    const candidate = attEntry({ id: 'new', clockIn: '08:00', clockOut: '16:00' });
    const others = [attEntry({ id: 'old', clockIn: '15:00', clockOut: '20:00' })];
    expect(findAttendanceOverlap(candidate, others)).toBe(true);
  });

  it('دو رکورد غیرهم‌پوشان (شیفت صبح و عصر) تضادی ندارند', () => {
    const candidate = attEntry({ id: 'new', clockIn: '08:00', clockOut: '12:00' });
    const others = [attEntry({ id: 'old', clockIn: '13:00', clockOut: '17:00' })];
    expect(findAttendanceOverlap(candidate, others)).toBe(false);
  });

  it('رکورد total_minutes بدون شیفت (بازه‌ی نامشخص) با هر رکورد کاری دیگر همان روز تضاد دارد', () => {
    const candidate = attEntry({ id: 'new', entryMode: 'total_minutes', clockIn: null, clockOut: null, shiftAssignmentId: null });
    const others = [attEntry({ id: 'old', clockIn: '08:00', clockOut: '16:00' })];
    expect(findAttendanceOverlap(candidate, others)).toBe(true);
  });

  it('دو رکورد total_minutes متصل به دو شیفت غیرهم‌پوشان مجازند (بازه از snapshot تخصیص)', () => {
    const candidate = attEntry({
      id: 'new', entryMode: 'total_minutes', clockIn: null, clockOut: null,
      shiftAssignmentId: 'shiftA', assignmentStartTime: '08:00', assignmentEndTime: '12:00',
    });
    const others = [attEntry({
      id: 'old', entryMode: 'total_minutes', clockIn: null, clockOut: null,
      shiftAssignmentId: 'shiftB', assignmentStartTime: '13:00', assignmentEndTime: '17:00',
    })];
    expect(findAttendanceOverlap(candidate, others)).toBe(false);
  });

  it('مرخصی/غیبت هرگز وارد بررسی هم‌پوشانی نمی‌شود', () => {
    const candidate = attEntry({ id: 'new', attendanceType: 'unpaid_leave', entryMode: 'total_minutes', clockIn: null, clockOut: null });
    const others = [attEntry({ id: 'old', clockIn: '08:00', clockOut: '16:00' })];
    expect(findAttendanceOverlap(candidate, others)).toBe(false);
  });

  it('مقایسه با خودش (همان id) نادیده گرفته می‌شود (ویرایش رکورد موجود)', () => {
    const candidate = attEntry({ id: 'same', clockIn: '08:00', clockOut: '16:00' });
    const others = [attEntry({ id: 'same', clockIn: '08:00', clockOut: '16:00' })];
    expect(findAttendanceOverlap(candidate, others)).toBe(false);
  });

  it('شیفت عبور از نیمه‌شب با شیفت روز بعد هم‌پوشانی را درست تشخیص می‌دهد', () => {
    const candidate = attEntry({ id: 'new', clockIn: '20:00', clockOut: '04:00', crossesMidnight: true });
    const others = [attEntry({ id: 'old', clockIn: '02:00', clockOut: '06:00', crossesMidnight: false })];
    expect(findAttendanceOverlap(candidate, others)).toBe(true);
  });
});
