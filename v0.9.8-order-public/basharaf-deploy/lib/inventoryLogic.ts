/**
 * Inventory & kitchen pure logic — بدون وابستگی به DB.
 * محاسبات واحد، بهای رسپی، و پیش‌بینی پخت (۳ سطح + ماندگاری).
 * این همان منطقی است که در دموی standalone تست شد (۳۵+ تست).
 */

// ─── واحدها ───
export const UNITS: Record<string, { label: string; base: number }> = {
  kg: { label: 'کیلوگرم', base: 1000 },
  g: { label: 'گرم', base: 1 },
  L: { label: 'لیتر', base: 1000 },
  ml: { label: 'میلی‌لیتر', base: 1 },
  pcs: { label: 'عدد', base: 1 },
  can: { label: 'قوطی', base: 1 },
  pack: { label: 'بسته', base: 1 },
};
export const toBase = (qtyInUnit: number, basePerUnit: number) => qtyInUnit * basePerUnit;
export const toUnit = (qtyInBase: number, basePerUnit: number) =>
  basePerUnit > 0 ? qtyInBase / basePerUnit : 0;

// ─── بها ───
export const usableCostPerBase = (avgCostPerBase: number, yieldPct: number) =>
  yieldPct > 0 ? avgCostPerBase / (yieldPct / 100) : 0;

export function lineCost(
  qtyBase: number,
  avgCostPerBase: number,
  yieldPct: number,
  overridePct?: number | null
): number {
  const y = overridePct != null && overridePct > 0 ? overridePct : yieldPct;
  return qtyBase * usableCostPerBase(avgCostPerBase, y);
}

export const suggestedPrice = (cpp: number, targetFcPct: number) =>
  targetFcPct > 0 ? cpp / (targetFcPct / 100) : 0;
export const actualFcPct = (cpp: number, price: number) =>
  price > 0 ? (cpp / price) * 100 : 0;

// ─── انواع ───
export type SalesDay = {
  jalaliDate: string;
  ts: number; // میلادی برای روز هفته
  lines: Array<{ recipeId: string; name: string; qty: number }>;
};
export type RecipeLite = {
  id: string;
  lines: Array<{ itemId: string; qtyBase: number }>;
};
export type ItemLite = {
  id: string;
  name: string;
  kind: 'raw' | 'prep';
  unit: string;
  basePerUnit: number;
  qtyBase: number;
  batchYieldBase?: number | null;
  shelfLifeDays?: number;
  prepRecipe?: Array<{ itemId: string; qtyBase: number }> | null;
};

export const WEEKDAYS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];
export const weekdayOf = (ts: number) => new Date(ts).getDay();

export const DAY_TYPES: Record<string, { label: string; factor: number }> = {
  normal: { label: 'عادی', factor: 1.0 },
  holiday: { label: 'تعطیل رسمی', factor: 1.4 },
  occasion: { label: 'مناسبت/شب خاص', factor: 1.6 },
  ramadan: { label: 'ماه رمضان', factor: 0.4 },
  closed: { label: 'رستوران تعطیل', factor: 0.0 },
};

export function eventFactor(ev?: { type?: string; factorOverride?: number | null }) {
  if (!ev || !ev.type || ev.type === 'normal')
    return { factor: 1.0, type: 'normal', label: DAY_TYPES.normal!.label, source: 'default' as const };
  const base = DAY_TYPES[ev.type] || DAY_TYPES.normal!;
  const factor = ev.factorOverride != null ? ev.factorOverride : base.factor;
  return {
    factor,
    type: ev.type,
    label: base.label,
    source: (ev.factorOverride != null ? 'manual' : 'smart') as 'manual' | 'smart',
  };
}

export type ForecastOpts = {
  mode?: 'simple' | 'weekday';
  window?: number;
  horizon?: number;
  targetTs?: number;
  event?: { type?: string; factorOverride?: number | null; reserved?: Record<string, number> };
};

/**
 * پیش‌بینی پخت: سطح۱ میانگین ساده، سطح۲ وزن روز هفته (fallback اگر <۲ نمونه)،
 * سطح۳ ضریب رویداد. + روزهای پوشش و هشدار تولید نیمه‌آماده با ماندگاری.
 */
export function forecast(
  sales: SalesDay[],
  recipes: Record<string, RecipeLite>,
  items: Record<string, ItemLite>,
  opts: ForecastOpts = {}
) {
  const mode = opts.mode || 'weekday';
  const win = opts.window || 28;
  const horizon = Math.max(1, opts.horizon || 1);
  const targetTs = opts.targetTs || Date.now() + 86400000;
  const targetWd = weekdayOf(targetTs);
  const recent = sales.slice(0, win);

  const per: Record<string, { name: string; allTotal: number; wdTotal: number }> = {};
  const allDates = new Set<string>();
  const wdDates = new Set<string>();
  for (const day of recent) {
    const wd = day.ts != null ? weekdayOf(day.ts) : null;
    allDates.add(day.jalaliDate);
    const isWd = wd === targetWd;
    if (isWd) wdDates.add(day.jalaliDate);
    for (const l of day.lines) {
      if (!per[l.recipeId]) per[l.recipeId] = { name: l.name, allTotal: 0, wdTotal: 0 };
      per[l.recipeId]!.allTotal += l.qty;
      if (isWd) per[l.recipeId]!.wdTotal += l.qty;
    }
  }
  const allDayCount = allDates.size || 1;
  const wdDayCount = wdDates.size;

  const ef = eventFactor(opts.event);
  const reserved = opts.event?.reserved || {};

  const plan = Object.entries(per).map(([rid, d]) => {
    const simpleAvg = d.allTotal / allDayCount;
    let avg: number, basis: 'weekday' | 'fallback' | 'simple';
    if (mode === 'weekday' && wdDayCount >= 2) {
      avg = d.wdTotal / wdDayCount;
      basis = 'weekday';
    } else {
      avg = simpleAvg;
      basis = mode === 'weekday' ? 'fallback' : 'simple';
    }
    const baseSuggested = Math.ceil(avg);
    const res = reserved[rid] || 0;
    const suggested = Math.ceil(avg * ef.factor + res);
    return { recipeId: rid, name: d.name, avgPerDay: avg, simpleAvg, basis, baseSuggested, factor: ef.factor, reserved: res, suggested };
  });
  plan.sort((a, b) => b.suggested - a.suggested);

  // نیاز روزانه (واحد پایه)
  const needBase: Record<string, number> = {};
  for (const p of plan) {
    const r = recipes[p.recipeId];
    if (!r) continue;
    for (const line of r.lines) needBase[line.itemId] = (needBase[line.itemId] || 0) + line.qtyBase * p.suggested;
  }

  // پوشش مواد خام (نیاز افق)
  const rawCoverage = Object.keys(needBase)
    .map((id) => items[id])
    .filter((it): it is NonNullable<typeof it> => !!it && it.kind !== 'prep')
    .map((it) => {
      const dailyUse = needBase[it.id] ?? 0;
      const cover = dailyUse > 0 ? it.qtyBase / dailyUse : Infinity;
      const needSpan = dailyUse * horizon;
      return { itemId: it.id, name: it.name, unit: it.unit, basePerUnit: it.basePerUnit, qtyBase: it.qtyBase, dailyUse, coverDays: cover, needSpan, shortfall: Math.max(0, needSpan - it.qtyBase) };
    })
    .sort((a, b) => a.coverDays - b.coverDays);

  // نیمه‌آماده: پوشش + ماندگاری + تولید لازم
  const prepCoverage: any[] = [];
  const prepAlerts: any[] = [];
  for (const it of Object.values(items)) {
    if (it.kind !== 'prep') continue;
    const dailyUse = needBase[it.id] || 0;
    const shelf = it.shelfLifeDays || 1;
    const isDaily = shelf <= 1;
    const cover = dailyUse > 0 ? it.qtyBase / dailyUse : Infinity;
    const produceFor = Math.min(horizon, shelf); // هرگز بیش از ماندگاری
    const needSpan = dailyUse * produceFor;
    const shortfall = Math.max(0, needSpan - it.qtyBase);
    const batchYield = it.batchYieldBase || 1;
    const batches = shortfall > 0 ? Math.ceil(shortfall / batchYield) : 0;
    prepCoverage.push({ itemId: it.id, name: it.name, unit: it.unit, basePerUnit: it.basePerUnit, qtyBase: it.qtyBase, dailyUse, coverDays: cover, shelf, isDaily, produceFor });
    if (dailyUse > 0 && batches > 0) {
      const rawNeed = (it.prepRecipe || []).map((pl) => {
        const ri = items[pl.itemId];
        return { itemId: pl.itemId, name: ri?.name || pl.itemId, qtyBase: pl.qtyBase * batches, unit: ri?.unit || 'kg', basePerUnit: ri?.basePerUnit || 1, have: ri?.qtyBase || 0 };
      });
      prepAlerts.push({ itemId: it.id, name: it.name, qtyBase: it.qtyBase, dailyUse, coverDays: cover, shelf, isDaily, produceFor, batches, producedBase: batchYield * batches, rawNeed, unit: it.unit, basePerUnit: it.basePerUnit });
    }
  }

  return {
    targetWd, targetWdName: WEEKDAYS[targetWd], wdDayCount, allDayCount,
    mode, horizon, event: ef, plan, needBase, rawCoverage, prepCoverage, prepAlerts,
  };
}
