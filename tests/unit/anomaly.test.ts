import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isWasteSpike, isPriceJump, isOffHours, isConsumptionSpike, getTehranHour } from '@/lib/anomaly/utils';

// ─── تست توابع خالص قوانین کارآگاه ─────────────────────────────
describe('wasteSpikeRule helpers', () => {
  it('flags when total exceeds threshold multiplier', () => {
    expect(isWasteSpike(2_100_000, 1_000_000, 200)).toBe(true); // 2.1x > 2x
  });

  it('does not flag when total equals threshold (boundary)', () => {
    expect(isWasteSpike(2_000_000, 1_000_000, 200)).toBe(false); // exactly 2x → not strictly greater
  });

  it('does not flag when avg is zero', () => {
    expect(isWasteSpike(5_000_000, 0, 200)).toBe(false);
  });

  it('does not flag when within threshold', () => {
    expect(isWasteSpike(1_500_000, 1_000_000, 200)).toBe(false); // 1.5x < 2x
  });
});

describe('priceJumpRule helpers', () => {
  it('flags when new price exceeds jump threshold', () => {
    expect(isPriceJump(131, 100, 30)).toBe(true); // 31% jump > 30% threshold
  });

  it('does not flag at exact threshold (boundary)', () => {
    expect(isPriceJump(130, 100, 30)).toBe(false); // exactly 30% → not strictly greater
  });

  it('does not flag when avg is zero', () => {
    expect(isPriceJump(500, 0, 30)).toBe(false);
  });

  it('does not flag when price drops', () => {
    expect(isPriceJump(80, 100, 30)).toBe(false); // negative jump
  });
});

describe('consumptionSpikeRule helpers', () => {
  it('flags when consumption exceeds multiplier threshold', () => {
    expect(isConsumptionSpike(260, 100, 250)).toBe(true); // 2.6x > 2.5x
  });

  it('does not flag at exact threshold', () => {
    expect(isConsumptionSpike(250, 100, 250)).toBe(false); // exactly 2.5x
  });
});

describe('offHoursRule helpers', () => {
  it('flags late night hours (>= 23:00)', () => {
    expect(isOffHours(23, 23, 5)).toBe(true);
    expect(isOffHours(0, 23, 5)).toBe(true);
    expect(isOffHours(4, 23, 5)).toBe(true);
  });

  it('does not flag normal business hours', () => {
    expect(isOffHours(9, 23, 5)).toBe(false);
    expect(isOffHours(22, 23, 5)).toBe(false);
    expect(isOffHours(5, 23, 5)).toBe(false); // exactly endHour → normal
  });
});

describe('getTehranHour', () => {
  it('returns a number between 0 and 23', () => {
    const h = getTehranHour(new Date());
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(23);
  });

  it('handles known UTC timestamps', () => {
    // ۲۰۲۶-۰۷-۰۶ ۱۲:۰۰ UTC = ۱۵:۳۰ تهران در تابستان (IRST = UTC+3:30)
    const d = new Date('2026-07-06T12:00:00Z');
    const h = getTehranHour(d);
    expect(h).toBe(15);
  });
});

// ─── تست dedup engine (با mock DB) ───────────────────────────────
vi.mock('@/lib/db/client', () => {
  const mockDb = {
    select: vi.fn(),
    insert: vi.fn(),
  };
  return { db: mockDb, schema: { anomalyFindings: {}, anomalyRules: {}, users: {}, notificationRules: {} } };
});

vi.mock('@/lib/notify', () => ({
  notifyAdmins: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/jalali', () => ({
  getTodayJalali: vi.fn().mockReturnValue('1405/04/15'),
}));

describe('saveFindings dedup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips insert when duplicate exists', async () => {
    const { db } = await import('@/lib/db/client');

    // mock: isDuplicate → مثبت (یافته تکراری وجود دارد)
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 'existing-id' }]),
        }),
      }),
    });

    const { saveFindings } = await import('@/lib/anomaly/engine');
    await saveFindings([
      {
        ruleKey: 'waste_spike',
        severity: 'high',
        entityId: 'voucher-123',
        details: {},
        note: 'test',
      },
    ]);

    expect(db.insert).not.toHaveBeenCalled();
  });

  it('inserts when no duplicate exists', async () => {
    const { db } = await import('@/lib/db/client');

    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'new-finding-id' }]),
      }),
    });

    const { saveFindings } = await import('@/lib/anomaly/engine');
    await saveFindings([
      {
        ruleKey: 'waste_spike',
        severity: 'high',
        entityId: 'voucher-456',
        details: { todayTotal: 3000000 },
        note: 'test finding',
      },
    ]);

    expect(db.insert).toHaveBeenCalled();
  });
});
