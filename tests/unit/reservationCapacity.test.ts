import { describe, it, expect } from 'vitest';
import {
  jalaliSlotToDate, reservationInterval, intervalsOverlap, generateSlotsForDate,
  findTableForInterval, checkSpecificTableCapacity, maxSingleTableCapacity,
  isPastJalaliDate, isTodayJalaliDate, jalaliWeekday,
  CAPACITY_HOLDING_STATUSES, type TableForAssignment, type ExistingReservationForCapacity,
} from '@/lib/reservations/capacity';
import type { TehranNow } from '@/lib/reservations/tehranTime';
import type { ReservationSettings } from '@/lib/db/schema';

function settings(overrides: Partial<ReservationSettings> = {}): ReservationSettings {
  return {
    id: 'settings-1',
    branchId: 'branch-1',
    lunchEnabled: false,
    lunchStartHour: 12,
    lunchEndHour: 16,
    dinnerEnabled: false,
    dinnerStartHour: 19,
    dinnerEndHour: 23,
    openHour: 19,
    closeHour: 23,
    closedWeekdays: [],
    maxPartySize: 12,
    maxActiveReservationsPerPhone: 3,
    closedMessage: null,
    closedPhone: null,
    updatedAt: new Date(),
    ...overrides,
  };
}

// میزهای دقیق طبق مشخصات کاربر: الف(۶)، ب(۴)، پ(۴)، ت(۳)، ث(۷، سوشیال).
function realTables(): TableForAssignment[] {
  return [
    { id: 'alef', name: 'الف', capacity: 6, isSocial: false, isActive: true },
    { id: 'be', name: 'ب', capacity: 4, isSocial: false, isActive: true },
    { id: 'pe', name: 'پ', capacity: 4, isSocial: false, isActive: true },
    { id: 'te', name: 'ت', capacity: 3, isSocial: false, isActive: true },
    { id: 'se', name: 'ث', capacity: 7, isSocial: true, isActive: true },
  ];
}

function table(overrides: Partial<TableForAssignment> = {}): TableForAssignment {
  return { id: 't1', name: 'میز ۱', capacity: 4, isSocial: false, isActive: true, ...overrides };
}

/** رزرو موجود با ساعت شروع مشخص در تاریخ ثابت '1405/07/10' — پایان خودکار ۶۰ دقیقه بعد. */
function existingAt(tableId: string, time: string, partySize: number, status = 'confirmed', id?: string): ExistingReservationForCapacity {
  const interval = reservationInterval('1405/07/10', time)!;
  return { id, tableId, partySize, status, start: interval.start, end: interval.end };
}
function targetAt(time: string) {
  return reservationInterval('1405/07/10', time)!;
}

describe('jalaliSlotToDate / reservationInterval', () => {
  it('combines a Jalali date with an HH:mm time into a real Date', () => {
    const d = jalaliSlotToDate('1405/02/31', '13:30');
    expect(d).not.toBeNull();
    expect(d!.getHours()).toBe(13);
    expect(d!.getMinutes()).toBe(30);
  });

  it('returns null for an invalid date or time', () => {
    expect(jalaliSlotToDate('not-a-date', '13:30')).toBeNull();
    expect(jalaliSlotToDate('1405/02/31', 'nope')).toBeNull();
  });

  it('a reservation interval is exactly 60 minutes', () => {
    const i = reservationInterval('1405/07/10', '19:00')!;
    expect((i.end.getTime() - i.start.getTime()) / 60000).toBe(60);
  });
});

describe('intervalsOverlap — مثال نهم (19–20 و 20–21 تداخل ندارند)', () => {
  it('19:00-20:00 and 20:00-21:00 do not overlap (end of one == start of next)', () => {
    const a = targetAt('19:00');
    const b = targetAt('20:00');
    expect(intervalsOverlap(a.start, a.end, b.start, b.end)).toBe(false);
  });

  it('an irregular 19:30-20:30 reservation conflicts with both the 19:00 and 20:00 slot', () => {
    const irregular = reservationInterval('1405/07/10', '19:30')!;
    const irregularEnd = new Date(irregular.start.getTime() + 60 * 60000);
    const slot19 = targetAt('19:00');
    const slot20 = targetAt('20:00');
    expect(intervalsOverlap(irregular.start, irregularEnd, slot19.start, slot19.end)).toBe(true);
    expect(intervalsOverlap(irregular.start, irregularEnd, slot20.start, slot20.end)).toBe(true);
  });
});

describe('generateSlotsForDate', () => {
  it('returns nothing when closeHour is not set (not activated yet)', () => {
    expect(generateSlotsForDate(settings({ closeHour: null }), '1405/07/10')).toEqual([]);
  });

  it('builds hourly slots from openHour to closeHour (exclusive)', () => {
    const slots = generateSlotsForDate(settings({ openHour: 19, closeHour: 23 }), '1405/12/01');
    expect(slots.map((s) => s.time)).toEqual(['19:00', '20:00', '21:00', '22:00']);
  });

  it('returns nothing for a past date', () => {
    const now: TehranNow = { year: 2026, month: 6, day: 15, hour: 10, minute: 0, weekday: 1 };
    expect(generateSlotsForDate(settings(), '1404/01/01', now)).toEqual([]);
  });

  it('drops slots whose start hour has already passed only for today', () => {
    // «الان» شمسی ۱۴۰۵/۰۷/۱۰، ساعت ۲۰:۳۰ — یعنی ۱۹ گذشته، ۲۰ گذشته (h<=hour)، ۲۱ و ۲۲ باقی
    const now = jalaliNowAt('1405/07/10', 20, 30);
    const slotsToday = generateSlotsForDate(settings({ openHour: 19, closeHour: 23 }), '1405/07/10', now);
    expect(slotsToday.map((s) => s.time)).toEqual(['21:00', '22:00']);

    const slotsTomorrow = generateSlotsForDate(settings({ openHour: 19, closeHour: 23 }), '1405/07/11', now);
    expect(slotsTomorrow.map((s) => s.time)).toEqual(['19:00', '20:00', '21:00', '22:00']);
  });

  it('a closed weekday returns nothing, independent of other days', () => {
    const weekday = jalaliWeekday('1405/07/10')!;
    expect(generateSlotsForDate(settings({ closedWeekdays: [weekday] }), '1405/07/10')).toEqual([]);
    expect(generateSlotsForDate(settings({ closedWeekdays: [weekday] }), '1405/07/11').length).toBeGreaterThan(0);
  });
});

/** یک TehranNow دستی از یک تاریخ شمسی + ساعت بساز (برای تست‌های «امروز/گذشته»). */
function jalaliNowAt(jalaliDate: string, hour: number, minute: number): TehranNow {
  const d = jalaliSlotToDate(jalaliDate, `${hour}:${String(minute).padStart(2, '0')}`)!;
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), hour, minute, weekday: d.getDay() };
}

describe('isPastJalaliDate / isTodayJalaliDate', () => {
  it('correctly classifies past/today/future relative to a fixed now', () => {
    const now = jalaliNowAt('1405/07/10', 12, 0);
    expect(isPastJalaliDate('1405/07/09', now)).toBe(true);
    expect(isPastJalaliDate('1405/07/10', now)).toBe(false);
    expect(isPastJalaliDate('1405/07/11', now)).toBe(false);
    expect(isTodayJalaliDate('1405/07/10', now)).toBe(true);
    expect(isTodayJalaliDate('1405/07/11', now)).toBe(false);
  });
});

describe('findTableForInterval — پایه', () => {
  it('assigns the smallest non-social table that fits (best fit)', () => {
    const tables = [table({ id: 'small', capacity: 2 }), table({ id: 'big', capacity: 6 })];
    const a = findTableForInterval(tables, [], [], targetAt('19:00'), 2);
    expect(a).toMatchObject({ tableId: 'small', isSocial: false });
  });

  it('ignores cancelled/no_show reservations when checking occupancy', () => {
    const tables = [table({ id: 't1', capacity: 4 })];
    const existing = [existingAt('t1', '19:00', 2, 'cancelled')];
    expect(findTableForInterval(tables, existing, [], targetAt('19:00'), 2)).toMatchObject({ tableId: 't1' });
  });

  it('never assigns an inactive table', () => {
    const tables = [table({ id: 't1', capacity: 6, isActive: false })];
    expect(findTableForInterval(tables, [], [], targetAt('19:00'), 2)).toBeNull();
  });

  it('an overlapping table block prevents assignment even without a reservation', () => {
    const tables = [table({ id: 't1', capacity: 4 })];
    const blocks = [{ tableId: 't1', ...targetAt('19:00') }];
    expect(findTableForInterval(tables, [], blocks, targetAt('19:00'), 2)).toBeNull();
  });

  it('CAPACITY_HOLDING_STATUSES matches the documented capacity rule', () => {
    expect(CAPACITY_HOLDING_STATUSES).toEqual(['pending', 'confirmed', 'seated']);
  });
});

// ─── مثال‌های الزامی بخش پنجم (سند کاربر) ─────────────────────────
describe('۱۳ مثال الزامی', () => {
  it('مثال ۱: همه میزها خالی، گروه دونفره → میز سه‌نفره (ت)', () => {
    const a = findTableForInterval(realTables(), [], [], targetAt('19:00'), 2);
    expect(a).toMatchObject({ tableId: 'te', isSocial: false });
  });

  it('مثال ۲: دو میز چهارنفره (ب،پ) هرکدام با یک گروه دونفره پر شده‌اند — صندلی‌های خالی ظاهری قابل رزرو نیست', () => {
    const existing = [existingAt('be', '19:00', 2), existingAt('pe', '19:00', 2), existingAt('alef', '19:00', 6)];
    // فقط ت (۳ نفره) خالی مونده؛ یک گروه چهارنفره نباید بتونه از صندلی‌های نیمه‌خالی ب/پ استفاده کنه (نوع میز = معمولی)
    const four = findTableForInterval(realTables(), existing, [], targetAt('19:00'), 4, undefined, 'normal');
    expect(four).toBeNull();
  });

  it('مثال ۳: میزهای معمولی اشغال، سوشیال کاملاً خالی — گروه هفت‌نفره می‌تواند تمام سوشیال را بگیرد', () => {
    const existing = [
      existingAt('be', '19:00', 2), existingAt('pe', '19:00', 2),
      existingAt('alef', '19:00', 6), existingAt('te', '19:00', 3),
    ];
    const a = findTableForInterval(realTables(), existing, [], targetAt('19:00'), 7);
    expect(a).toMatchObject({ tableId: 'se', isSocial: true });
  });

  it('مثال ۴: دو نفر روی سوشیال رزرو دارند (۵ صندلی باقی) — گروه هفت‌نفره رد می‌شود، از میزهای معمولی هم جمع نمی‌شود', () => {
    const existing = [
      existingAt('be', '19:00', 2), existingAt('pe', '19:00', 2),
      existingAt('se', '19:00', 2),
    ];
    const a = findTableForInterval(realTables(), existing, [], targetAt('19:00'), 7);
    expect(a).toBeNull();
  });

  it('مثال ۵: سوشیال دو رزرو دونفره دارد (۳ صندلی باقی) — سه‌نفره پذیرفته، چهارنفره رد می‌شود', () => {
    const existing = [existingAt('se', '19:00', 2), existingAt('se', '19:00', 2, 'confirmed', 'r2')];
    // میزهای معمولی رو هم پر فرض کنیم که مجبور به سوشیال بشه
    const busy = [...existing, existingAt('alef', '19:00', 6), existingAt('be', '19:00', 4), existingAt('pe', '19:00', 4), existingAt('te', '19:00', 3)];
    const three = findTableForInterval(realTables(), busy, [], targetAt('19:00'), 3);
    expect(three).toMatchObject({ tableId: 'se', isSocial: true });
    const four = findTableForInterval(realTables(), busy, [], targetAt('19:00'), 4);
    expect(four).toBeNull();
  });

  it('مثال ۶: دو میز چهارنفره خالی ولی میز شش‌نفره اشغال — درخواست میز معمولی رد می‌شود (ترکیب خودکار ممنوع)، سوشیال خالی فقط جداگانه پیشنهاد می‌شود', () => {
    const existing = [existingAt('alef', '19:00', 5)];
    const normal = findTableForInterval(realTables(), existing, [], targetAt('19:00'), 6, undefined, 'normal');
    expect(normal).toBeNull(); // ب و پ جدا جدا فقط ۴ نفر جا می‌دهند، ترکیب‌شان اتوماتیک نمی‌شود
    const social = findTableForInterval(realTables(), existing, [], targetAt('19:00'), 6, undefined, 'social');
    expect(social).toMatchObject({ tableId: 'se', isSocial: true }); // پیشنهاد جداگانه، فقط با نوع میز = سوشیال
  });

  it('مثال ۷: فقط میز شش‌نفره (الف) خالی از معمولی‌ها — گروه دونفره کل میز شش‌نفره را می‌گیرد', () => {
    const existing = [existingAt('be', '19:00', 4), existingAt('pe', '19:00', 4), existingAt('te', '19:00', 3)];
    const a = findTableForInterval(realTables(), existing, [], targetAt('19:00'), 2);
    expect(a).toMatchObject({ tableId: 'alef' });
  });

  it('مثال ۸: سوشیال ۱۹-۲۰ کامل پر است — هم‌پوشان رد، ولی ۲۰:۰۰ (بدون رزرو بعدی) آزاد است', () => {
    const existing = [existingAt('se', '19:00', 7)];
    const overlap = findTableForInterval([realTables()[4]!], existing, [], targetAt('19:00'), 3);
    expect(overlap).toBeNull();
    const next = findTableForInterval([realTables()[4]!], existing, [], targetAt('20:00'), 3);
    expect(next).toMatchObject({ tableId: 'se' });
  });

  it('مثال ۹: رزرو ۱۹:۳۰-۲۰:۳۰ با هر دو اسلات ۱۹-۲۰ و ۲۰-۲۱ همان میز تداخل دارد', () => {
    const irregular = reservationInterval('1405/07/10', '19:30')!;
    const existing: ExistingReservationForCapacity[] = [{
      tableId: 'alef', partySize: 2, status: 'confirmed', start: irregular.start,
      end: new Date(irregular.start.getTime() + 60 * 60000),
    }];
    const at19 = findTableForInterval([realTables()[0]!], existing, [], targetAt('19:00'), 2);
    const at20 = findTableForInterval([realTables()[0]!], existing, [], targetAt('20:00'), 2);
    expect(at19).toBeNull();
    expect(at20).toBeNull();
  });

  it('مثال ۱۰: دو درخواست هم‌زمان برای آخرین میز — دومی باید null بگیرد (تست منطق، نه race واقعی DB)', () => {
    const tables = [table({ id: 'only', capacity: 4 })];
    const firstAssignment = findTableForInterval(tables, [], [], targetAt('19:00'), 4);
    expect(firstAssignment).not.toBeNull();
    const afterFirstBooked: ExistingReservationForCapacity[] = [existingAt('only', '19:00', 4)];
    const secondAssignment = findTableForInterval(tables, afterFirstBooked, [], targetAt('19:00'), 4);
    expect(secondAssignment).toBeNull();
  });

  it('مثال ۱۱: رزرو لغوشده دیگر ظرفیت اشغال نمی‌کند', () => {
    const tables = [table({ id: 't1', capacity: 4 })];
    const cancelled = [existingAt('t1', '19:00', 4, 'cancelled')];
    expect(findTableForInterval(tables, cancelled, [], targetAt('19:00'), 4)).toMatchObject({ tableId: 't1' });
  });

  it('مثال ۱۲: هنگام ویرایش، رزرو با خودش تداخل ندارد (excludeReservationId)', () => {
    const tables = [table({ id: 't1', capacity: 4, isSocial: true })];
    const mine = existingAt('t1', '19:00', 4, 'confirmed', 'mine');
    const check = checkSpecificTableCapacity(tables[0]!, [mine], [], targetAt('19:00'), 4, 'mine');
    expect(check.ok).toBe(true);
    const checkWithoutExclude = checkSpecificTableCapacity(tables[0]!, [mine], [], targetAt('19:00'), 4);
    expect(checkWithoutExclude.ok).toBe(false);
  });

  it('مثال ۱۳: تعداد نفرات باید عدد صحیح ۱ تا حداکثر ظرفیت تک‌میزی باشد', () => {
    expect(maxSingleTableCapacity(realTables())).toBe(7);
    // ۸ نفر ساختاری روی هیچ میزی (حتی سوشیال با ظرفیت ۷) جا نمی‌شود
    expect(findTableForInterval(realTables(), [], [], targetAt('19:00'), 8)).toBeNull();
  });
});

describe('checkSpecificTableCapacity', () => {
  it('rejects a party larger than the table itself', () => {
    const t = table({ capacity: 4 });
    expect(checkSpecificTableCapacity(t, [], [], targetAt('19:00'), 5).ok).toBe(false);
  });

  it('rejects an inactive table', () => {
    const t = table({ isActive: false });
    expect(checkSpecificTableCapacity(t, [], [], targetAt('19:00'), 1).ok).toBe(false);
  });

  it('rejects a blocked table for the overlapping window', () => {
    const t = table({ id: 't1', capacity: 4 });
    const blocks = [{ tableId: 't1', ...targetAt('19:00') }];
    expect(checkSpecificTableCapacity(t, [], blocks, targetAt('19:00'), 2).ok).toBe(false);
  });

  it('allows multiple non-overlapping parties on a social table up to capacity', () => {
    const t = table({ id: 'social', capacity: 7, isSocial: true });
    const existing = [existingAt('social', '19:00', 4)];
    expect(checkSpecificTableCapacity(t, existing, [], targetAt('19:00'), 3).ok).toBe(true);
    expect(checkSpecificTableCapacity(t, existing, [], targetAt('19:00'), 4).ok).toBe(false);
  });
});
