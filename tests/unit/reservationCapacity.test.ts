import { describe, it, expect } from 'vitest';
import { jalaliSlotToDate, computeTodayAvailability, CAPACITY_HOLDING_STATUSES } from '@/lib/reservations/capacity';
import type { ReservationSettings } from '@/lib/db/schema';

function settings(overrides: Partial<ReservationSettings> = {}): ReservationSettings {
  return {
    id: 'settings-1',
    branchId: 'branch-1',
    isPublicEnabled: true,
    tableCount: 5,
    maxPartySize: 8,
    maxActiveReservationsPerPhone: 3,
    closedMessage: null,
    closedPhone: null,
    updatedAt: new Date(),
    ...overrides,
  };
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

describe('computeTodayAvailability', () => {
  it('is closed when the owner has not toggled it on today', () => {
    const r = computeTodayAvailability(settings({ isPublicEnabled: false }), 0);
    expect(r).toEqual({ open: false, remainingTables: 0 });
  });

  it('is open with full remaining capacity when nothing is booked yet', () => {
    const r = computeTodayAvailability(settings({ tableCount: 5 }), 0);
    expect(r).toEqual({ open: true, remainingTables: 5 });
  });

  it('subtracts already-active reservations from the table count', () => {
    const r = computeTodayAvailability(settings({ tableCount: 5 }), 3);
    expect(r).toEqual({ open: true, remainingTables: 2 });
  });

  it('closes once active reservations reach the table count', () => {
    const r = computeTodayAvailability(settings({ tableCount: 5 }), 5);
    expect(r).toEqual({ open: false, remainingTables: 0 });
  });

  it('never returns negative remaining capacity if count somehow exceeds the table count', () => {
    const r = computeTodayAvailability(settings({ tableCount: 5 }), 9);
    expect(r).toEqual({ open: false, remainingTables: 0 });
  });

  it('CAPACITY_HOLDING_STATUSES matches the documented capacity rule', () => {
    expect(CAPACITY_HOLDING_STATUSES).toEqual(['pending', 'confirmed', 'seated']);
  });
});
