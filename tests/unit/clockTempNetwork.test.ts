import { describe, expect, it } from 'vitest';
import { networkAppliesTo } from '@/lib/attendance-clock/rules';

describe('temporary clock networks', () => {
  const now = new Date('2026-11-03T10:00:00Z');
  const soon = new Date('2026-11-03T11:00:00Z');
  const past = new Date('2026-11-03T09:59:59Z');

  it('a permanent shop IP applies to everyone, always', () => {
    expect(networkAppliesTo({ employeeId: null, expiresAt: null }, 'a', now)).toBe(true);
    expect(networkAppliesTo({ employeeId: null, expiresAt: null }, null, now)).toBe(true);
  });

  it('a per-person entry applies only to that person until it expires', () => {
    expect(networkAppliesTo({ employeeId: 'a', expiresAt: soon }, 'a', now)).toBe(true);
    expect(networkAppliesTo({ employeeId: 'a', expiresAt: soon }, 'b', now)).toBe(false);
    expect(networkAppliesTo({ employeeId: 'a', expiresAt: soon }, null, now)).toBe(false);
    expect(networkAppliesTo({ employeeId: 'a', expiresAt: past }, 'a', now)).toBe(false);
  });

  it('a temporary entry for everyone stops at its expiry', () => {
    expect(networkAppliesTo({ employeeId: null, expiresAt: soon }, 'b', now)).toBe(true);
    expect(networkAppliesTo({ employeeId: null, expiresAt: now }, 'b', now)).toBe(false);
  });
});
