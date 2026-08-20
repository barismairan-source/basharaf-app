import { describe, it, expect } from 'vitest';
import {
  jalaliSlotToDate, generateTodaySlots, findTableForSlot, CAPACITY_HOLDING_STATUSES,
  type TableForAssignment,
} from '@/lib/reservations/capacity';
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
    maxPartySize: 12,
    maxActiveReservationsPerPhone: 3,
    closedMessage: null,
    closedPhone: null,
    updatedAt: new Date(),
    ...overrides,
  };
}

function table(overrides: Partial<TableForAssignment> = {}): TableForAssignment {
  return { id: 't1', name: 'میز ۱', capacity: 4, isSocial: false, isActive: true, ...overrides };
}

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

describe('generateTodaySlots', () => {
  it('returns nothing when both shifts are disabled', () => {
    expect(generateTodaySlots(settings(), new Date(2026, 4, 1, 9, 0))).toEqual([]);
  });

  it('builds hourly lunch slots from start to end (exclusive)', () => {
    const now = new Date(2026, 4, 1, 9, 0); // 09:00, well before lunch
    const slots = generateTodaySlots(settings({ lunchEnabled: true, lunchStartHour: 12, lunchEndHour: 16 }), now);
    expect(slots).toEqual([
      { time: '12:00', period: 'lunch' },
      { time: '13:00', period: 'lunch' },
      { time: '14:00', period: 'lunch' },
      { time: '15:00', period: 'lunch' },
    ]);
  });

  it('combines lunch and dinner when both are enabled', () => {
    const now = new Date(2026, 4, 1, 9, 0);
    const slots = generateTodaySlots(settings({
      lunchEnabled: true, lunchStartHour: 12, lunchEndHour: 14,
      dinnerEnabled: true, dinnerStartHour: 19, dinnerEndHour: 21,
    }), now);
    expect(slots.map((s) => s.time)).toEqual(['12:00', '13:00', '19:00', '20:00']);
  });

  it('drops slots whose start hour has already passed', () => {
    const now = new Date(2026, 4, 1, 13, 30); // 13:30 — 12:00 and 13:00 are gone
    const slots = generateTodaySlots(settings({ lunchEnabled: true, lunchStartHour: 12, lunchEndHour: 16 }), now);
    expect(slots.map((s) => s.time)).toEqual(['14:00', '15:00']);
  });
});

describe('findTableForSlot', () => {
  it('assigns the smallest non-social table that fits (best fit)', () => {
    const tables = [table({ id: 'small', capacity: 2 }), table({ id: 'big', capacity: 6 })];
    const a = findTableForSlot(tables, [], 2);
    expect(a).toMatchObject({ tableId: 'small', isSocial: false });
  });

  it('skips a non-social table already holding an active reservation for that slot', () => {
    const tables = [table({ id: 't1', capacity: 4 })];
    const existing = [{ tableId: 't1', partySize: 2, status: 'pending' }];
    expect(findTableForSlot(tables, existing, 2)).toBeNull();
  });

  it('ignores cancelled/no_show reservations when checking occupancy', () => {
    const tables = [table({ id: 't1', capacity: 4 })];
    const existing = [{ tableId: 't1', partySize: 2, status: 'cancelled' }];
    expect(findTableForSlot(tables, existing, 2)).toMatchObject({ tableId: 't1' });
  });

  it('falls back to the social table when no exclusive table fits', () => {
    const tables = [table({ id: 'small', capacity: 2 }), table({ id: 'social', capacity: 7, isSocial: true })];
    const a = findTableForSlot(tables, [], 5);
    expect(a).toMatchObject({ tableId: 'social', isSocial: true });
  });

  it('lets multiple separate parties share the social table up to its capacity', () => {
    const tables = [table({ id: 'social', capacity: 7, isSocial: true })];
    const existing = [{ tableId: 'social', partySize: 2, status: 'confirmed' }];
    const a = findTableForSlot(tables, existing, 4);
    expect(a).toMatchObject({ tableId: 'social', isSocial: true });
  });

  it('returns null once the social table also has no room left', () => {
    const tables = [table({ id: 'social', capacity: 7, isSocial: true })];
    const existing = [{ tableId: 'social', partySize: 5, status: 'seated' }];
    expect(findTableForSlot(tables, existing, 4)).toBeNull();
  });

  it('never assigns an inactive table', () => {
    const tables = [table({ id: 't1', capacity: 6, isActive: false })];
    expect(findTableForSlot(tables, [], 2)).toBeNull();
  });

  it('CAPACITY_HOLDING_STATUSES matches the documented capacity rule', () => {
    expect(CAPACITY_HOLDING_STATUSES).toEqual(['pending', 'confirmed', 'seated']);
  });
});
