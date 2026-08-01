import type { InvUnit } from '@/types';

/**
 * Pure helpers for the recipe weighing form. No DOM/React dependency —
 * unit-tested under vitest 'node' environment.
 */

const WEIGHT_UNITS: ReadonlySet<InvUnit> = new Set(['kg', 'g']);

export interface WeighingLine {
  qtyBase: number;
  itemUnit: InvUnit;
}

/**
 * Sums qtyBase across lines whose item uses a weight unit (kg/g).
 * qtyBase is already normalized to the item's base unit (grams, for a
 * weight-type item — see inv_items.basePerUnit) — no further conversion
 * needed, unlike a flat/unnormalized ingredient list.
 */
export function estimatedTotalWeightGrams(lines: readonly WeighingLine[]): number {
  return lines.reduce((sum, l) => (WEIGHT_UNITS.has(l.itemUnit) ? sum + l.qtyBase : sum), 0);
}

/** Number of lines with a real (>0) recorded quantity — powers the "X of Y weighed" stat. */
export function countWeighedLines(lines: readonly { qtyBase: number }[]): number {
  return lines.filter((l) => l.qtyBase > 0).length;
}
