import { describe, it, expect } from 'vitest';
import { applyDelta, reverseDelta, applyAndReverseSumToZero } from '@/lib/financial/balance';

describe('applyDelta', () => {
  it('income increases source balance', () => {
    const d = applyDelta({ type: 'income', amount: 100_000, accountId: 'acc1', destinationAccountId: null });
    expect(d.sourceDelta).toBe(100_000);
    expect(d.destDelta).toBe(0);
  });

  it('expense decreases source balance', () => {
    const d = applyDelta({ type: 'expense', amount: 50_000, accountId: 'acc1', destinationAccountId: null });
    expect(d.sourceDelta).toBe(-50_000);
    expect(d.destDelta).toBe(0);
  });

  it('transfer decreases source and increases destination', () => {
    const d = applyDelta({ type: 'transfer', amount: 200_000, accountId: 'acc1', destinationAccountId: 'acc2' });
    expect(d.sourceDelta).toBe(-200_000);
    expect(d.destDelta).toBe(200_000);
  });

  it('transfer without destination returns zero', () => {
    const d = applyDelta({ type: 'transfer', amount: 200_000, accountId: 'acc1', destinationAccountId: null });
    expect(d.sourceDelta).toBe(0);
    expect(d.destDelta).toBe(0);
  });

  it('handles zero amount', () => {
    const d = applyDelta({ type: 'income', amount: 0, accountId: 'acc1', destinationAccountId: null });
    expect(d.sourceDelta).toBe(0);
  });
});

describe('reverseDelta', () => {
  it('reversal of income decreases source balance', () => {
    const d = reverseDelta({ type: 'income', amount: 100_000, accountId: 'acc1', destinationAccountId: null });
    expect(d.sourceDelta).toBe(-100_000);
    expect(d.destDelta).toBe(0);
  });

  it('reversal of expense increases source balance', () => {
    const d = reverseDelta({ type: 'expense', amount: 50_000, accountId: 'acc1', destinationAccountId: null });
    expect(d.sourceDelta).toBe(50_000);
    expect(d.destDelta).toBe(0);
  });

  it('reversal of transfer reverses both accounts', () => {
    const d = reverseDelta({ type: 'transfer', amount: 200_000, accountId: 'acc1', destinationAccountId: 'acc2' });
    expect(d.sourceDelta).toBe(200_000);
    expect(d.destDelta).toBe(-200_000);
  });
});

describe('applyAndReverseSumToZero', () => {
  it.each([
    { type: 'income' as const, amount: 100_000, accountId: 'acc1', destinationAccountId: null },
    { type: 'expense' as const, amount: 75_000, accountId: 'acc1', destinationAccountId: null },
    { type: 'transfer' as const, amount: 300_000, accountId: 'acc1', destinationAccountId: 'acc2' },
  ])('apply + reverse = 0 for $type', (tx) => {
    expect(applyAndReverseSumToZero(tx)).toBe(true);
  });
});
