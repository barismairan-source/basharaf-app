import { describe, it, expect } from 'vitest';
import { lineCost, costRecipe, type CostingItem, type CostingLine } from '@/lib/inventory/costing';

const rawFlour: CostingItem = {
  id: 'flour',
  name: 'آرد',
  unit: 'gram',
  kind: 'raw',
  avgCostPerBase: 10, // 10 تومان/گرم
  yieldPct: 100,
};

const rawButter: CostingItem = {
  id: 'butter',
  name: 'کره',
  unit: 'gram',
  kind: 'raw',
  avgCostPerBase: 50, // 50 تومان/گرم
  yieldPct: 80, // 20% افت
};

describe('lineCost', () => {
  it('calculates cost with 100% yield (no loss)', () => {
    const line: CostingLine = { itemId: 'flour', qtyBase: 200, overridePct: null };
    const result = lineCost(rawFlour, line);
    // 200g * 10 / (100/100) = 2000
    expect(result.lineCost).toBe(2_000);
    expect(result.missingCost).toBe(false);
    expect(result.yieldUsed).toBe(100);
  });

  it('applies yield loss to increase cost', () => {
    const line: CostingLine = { itemId: 'butter', qtyBase: 100, overridePct: null };
    const result = lineCost(rawButter, line);
    // 100g * 50 / (80/100) = 5000 / 0.8 = 6250
    expect(result.lineCost).toBe(6_250);
    expect(result.yieldUsed).toBe(80);
  });

  it('overridePct takes precedence over item yieldPct', () => {
    const line: CostingLine = { itemId: 'butter', qtyBase: 100, overridePct: 50 };
    const result = lineCost(rawButter, line);
    // 100g * 50 / (50/100) = 5000 / 0.5 = 10000
    expect(result.lineCost).toBe(10_000);
    expect(result.yieldUsed).toBe(50);
  });

  it('returns missingCost=true for item with zero price', () => {
    const freeItem: CostingItem = { ...rawFlour, avgCostPerBase: 0 };
    const line: CostingLine = { itemId: 'flour', qtyBase: 100, overridePct: null };
    const result = lineCost(freeItem, line);
    expect(result.missingCost).toBe(true);
    expect(result.lineCost).toBe(0);
  });

  it('returns placeholder for undefined item', () => {
    const line: CostingLine = { itemId: 'missing', qtyBase: 100, overridePct: null };
    const result = lineCost(undefined, line);
    expect(result.missingCost).toBe(true);
    expect(result.lineCost).toBe(0);
    expect(result.name).toBe('— حذف‌شده —');
  });
});

describe('costRecipe', () => {
  const lines: CostingLine[] = [
    { itemId: 'flour', qtyBase: 500, overridePct: null },  // 500 * 10 = 5000
    { itemId: 'butter', qtyBase: 200, overridePct: null }, // 200 * 50 / 0.8 = 12500
  ];
  const itemsById: Record<string, CostingItem> = { flour: rawFlour, butter: rawButter };

  it('computes totalCost and costPerPortion', () => {
    const r = costRecipe({ portions: 10, price: 5_000, targetFcPct: 30 }, lines, itemsById);
    // totalCost = 5000 + 12500 = 17500
    expect(r.totalCost).toBe(17_500);
    // costPerPortion = 17500 / 10 = 1750
    expect(r.costPerPortion).toBe(1_750);
  });

  it('computes foodCostPct correctly', () => {
    const r = costRecipe({ portions: 10, price: 5_000, targetFcPct: 30 }, lines, itemsById);
    // (1750 / 5000) * 100 = 35.0
    expect(r.foodCostPct).toBe(35.0);
  });

  it('foodCostPct is null when price is zero', () => {
    const r = costRecipe({ portions: 10, price: 0, targetFcPct: 30 }, lines, itemsById);
    expect(r.foodCostPct).toBeNull();
  });

  it('suggestedPrice = costPerPortion / targetFcPct', () => {
    const r = costRecipe({ portions: 10, price: 5_000, targetFcPct: 25 }, lines, itemsById);
    // 1750 / 0.25 = 7000
    expect(r.suggestedPrice).toBe(7_000);
  });

  it('defaults portions to 1 when zero', () => {
    const r = costRecipe({ portions: 0, price: 5_000, targetFcPct: 30 }, lines, itemsById);
    expect(r.portions).toBe(1);
    expect(r.costPerPortion).toBe(r.totalCost);
  });

  it('hasMissingCosts=true when an item has zero price', () => {
    const freeFlour: CostingItem = { ...rawFlour, avgCostPerBase: 0 };
    const r = costRecipe({ portions: 5, price: 3_000, targetFcPct: 30 }, lines, { flour: freeFlour, butter: rawButter });
    expect(r.hasMissingCosts).toBe(true);
  });
});
