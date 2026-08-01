import { describe, it, expect } from 'vitest';
import { estimatedTotalWeightGrams, countWeighedLines } from '@/lib/recipeWeighing';

describe('estimatedTotalWeightGrams', () => {
  it('sums only weight-unit (kg/g) lines, ignoring pcs/L/ml/can/pack', () => {
    const total = estimatedTotalWeightGrams([
      { qtyBase: 160, itemUnit: 'g' },
      { qtyBase: 40, itemUnit: 'g' },
      { qtyBase: 200, itemUnit: 'ml' },
      { qtyBase: 1, itemUnit: 'pcs' },
    ]);
    expect(total).toBe(200);
  });

  it('returns 0 for an empty line list', () => {
    expect(estimatedTotalWeightGrams([])).toBe(0);
  });

  it('returns 0 when no line uses a weight unit', () => {
    const total = estimatedTotalWeightGrams([
      { qtyBase: 500, itemUnit: 'ml' },
      { qtyBase: 2, itemUnit: 'pcs' },
    ]);
    expect(total).toBe(0);
  });

  it('sums kg-unit lines the same as g-unit lines (qtyBase is already base-unit normalized)', () => {
    const total = estimatedTotalWeightGrams([
      { qtyBase: 1000, itemUnit: 'kg' },
      { qtyBase: 50, itemUnit: 'g' },
    ]);
    expect(total).toBe(1050);
  });
});

describe('countWeighedLines', () => {
  it('counts only lines with qtyBase > 0', () => {
    expect(countWeighedLines([{ qtyBase: 0 }, { qtyBase: 5 }, { qtyBase: 0 }])).toBe(1);
  });

  it('returns 0 for an empty list', () => {
    expect(countWeighedLines([])).toBe(0);
  });

  it('returns the full count when every line is weighed', () => {
    expect(countWeighedLines([{ qtyBase: 1 }, { qtyBase: 2 }])).toBe(2);
  });
});
