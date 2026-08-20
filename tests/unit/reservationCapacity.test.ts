import { describe, it, expect } from 'vitest';
import {
  generateSlotTimes, jalaliSlotToDate, isDateBookable, isSlotBookable,
  computeSlotAvailability, CAPACITY_HOLDING_STATUSES,
} from '@/lib/reservations/capacity';
import { dateToJalali } from '@/lib/jalali';
import type { ReservationSettings } from '@/lib/db/schema';

function settings(overrides: Partial<ReservationSettings> = {}): ReservationSettings {
  return {
    id: 'settings-1',
    branchId: 'branch-1',
    isPublicEnabled: true,
    workingDays: null,
    openTime: '12:00',
    closeTime: '14:00',
    slotMinutes: 30,
    slotCapacityGuests: 10,
    maxPartySize: 8,
    minLeadMinutes: 60,
    maxLeadDays: 30,
    blackoutDates: [],
    maxActiveReservationsPerPhone: 3,
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('generateSlotTimes', () => {
  it('builds slots from open to close at the configured step', () => {
    expect(generateSlotTimes(settings())).toEqual(['12:00', '12:30', '13:00', '13:30']);
  });

  it('returns empty when closeTime <= openTime', () => {
    expect(generateSlotTimes(settings({ openTime: '14:00', closeTime: '12:00' }))).toEqual([]);
  });

  it('returns empty on unparsable times', () => {
    expect(generateSlotTimes(settings({ openTime: 'bad' }))).toEqual([]);
  });

  it('respects a custom slot length', () => {
    expect(generateSlotTimes(settings({ openTime: '18:00', closeTime: '19:00', slotMinutes: 20 }))).toEqual(['18:00', '18:20', '18:40']);
  });
});

describe('jalaliSlotToDate', () => {
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
});

describe('isDateBookable', () => {
  const now = new Date(2026, 4, 1); // 1405/02/11 تقریبا — فقط برای مقایسه نسبی استفاده می‌شود

  it('rejects a blackout date', () => {
    const jalali = dateToJalali(now);
    const r = isDateBookable(settings({ blackoutDates: [jalali] }), jalali, now);
    expect(r.ok).toBe(false);
  });

  it('rejects a day of week not in workingDays', () => {
    const jalali = dateToJalali(now);
    const otherDay = (now.getDay() + 1) % 7;
    const r = isDateBookable(settings({ workingDays: [otherDay] }), jalali, now);
    expect(r.ok).toBe(false);
  });

  it('accepts today when workingDays includes it and no blackout', () => {
    const jalali = dateToJalali(now);
    const r = isDateBookable(settings({ workingDays: [now.getDay()] }), jalali, now);
    expect(r.ok).toBe(true);
  });

  it('rejects a date beyond maxLeadDays', () => {
    const far = new Date(now);
    far.setDate(far.getDate() + 40);
    const jalali = dateToJalali(far);
    const r = isDateBookable(settings({ maxLeadDays: 30 }), jalali, now);
    expect(r.ok).toBe(false);
  });

  it('rejects a date in the past', () => {
    const past = new Date(now);
    past.setDate(past.getDate() - 1);
    const jalali = dateToJalali(past);
    const r = isDateBookable(settings(), jalali, now);
    expect(r.ok).toBe(false);
  });
});

describe('isSlotBookable', () => {
  it('rejects a slot inside the minimum lead time', () => {
    const now = new Date(2026, 4, 1, 12, 0);
    const jalali = dateToJalali(now);
    // اسلات ساعت ۱۲:۱۵ — فقط ۱۵ دقیقه دیگر، کمتر از minLeadMinutes=60
    const r = isSlotBookable(settings({ minLeadMinutes: 60 }), jalali, '12:15', now);
    expect(r.ok).toBe(false);
  });

  it('accepts a slot beyond the minimum lead time', () => {
    const now = new Date(2026, 4, 1, 10, 0);
    const jalali = dateToJalali(now);
    const r = isSlotBookable(settings({ minLeadMinutes: 60, openTime: '12:00', closeTime: '14:00' }), jalali, '12:30', now);
    expect(r.ok).toBe(true);
  });
});

describe('computeSlotAvailability', () => {
  const now = new Date(2026, 4, 1, 0, 0);
  const jalali = dateToJalali(now);
  const s = settings({ openTime: '00:00', closeTime: '02:00', slotMinutes: 60, slotCapacityGuests: 10, minLeadMinutes: 0, workingDays: [now.getDay()] });

  it('marks a slot with no reservations as fully available', () => {
    const slots = computeSlotAvailability(s, jalali, [], now);
    expect(slots.find((x) => x.time === '00:00')).toMatchObject({ remainingGuests: 10, available: true });
  });

  it('subtracts party size of holding-status reservations only', () => {
    const existing = [
      { time: '00:00', partySize: 4, status: 'pending' },
      { time: '00:00', partySize: 3, status: 'confirmed' },
      { time: '00:00', partySize: 5, status: 'cancelled' }, // آزادشده — نباید کم شود
    ];
    const slots = computeSlotAvailability(s, jalali, existing, now);
    expect(slots.find((x) => x.time === '00:00')).toMatchObject({ remainingGuests: 3, available: true });
  });

  it('marks a slot unavailable once capacity is exhausted', () => {
    const existing = [{ time: '01:00', partySize: 10, status: 'seated' }];
    const slots = computeSlotAvailability(s, jalali, existing, now);
    expect(slots.find((x) => x.time === '01:00')).toMatchObject({ remainingGuests: 0, available: false });
  });

  it('CAPACITY_HOLDING_STATUSES matches the documented capacity rule', () => {
    expect(CAPACITY_HOLDING_STATUSES).toEqual(['pending', 'confirmed', 'seated']);
  });
});
