/**
 * محاسبه‌ی بهای تمام‌شده‌ی رسپی — منطق خالص (بدون DB).
 *
 * مدل:
 * - هر قلم avgCostPerBase دارد (تومان به‌ازای هر واحد پایه؛ مثلاً تومان/گرم).
 * - هر قلم yieldPct دارد (درصد قابل‌استفاده پس از افت/دورریز/پخت).
 * - هر خط رسپی qtyBase دارد (مقدار خالص لازم به واحد پایه).
 *   بهای خط = qtyBase × avgCostPerBase ÷ (yield/100)
 *   (چون برای رسیدن به مقدار خالص، باید بیشتر بخریم.)
 * - بهای کل ÷ portions = بهای هر پرس.
 * - food cost % = بهای هر پرس ÷ قیمت فروش × ۱۰۰.
 * - قیمت پیشنهادی = بهای هر پرس ÷ (targetFcPct/100).
 *
 * مواد نیمه‌آماده (prep): قلم prep خودش avgCostPerBase دارد که از
 * بهای رسپی‌اش به‌دست می‌آید (در costPrepItem محاسبه و در آن قلم ذخیره می‌شود).
 */

export interface CostingItem {
  id: string;
  name: string;
  unit: string;
  kind: 'raw' | 'prep';
  avgCostPerBase: number; // تومان / واحد پایه
  yieldPct: number;       // 1..100
}

export interface CostingLine {
  itemId: string;
  qtyBase: number;
  overridePct: number | null; // اگر برای این خط افت دستی تعیین شده
}

export interface LineCost {
  itemId: string;
  name: string;
  qtyBase: number;
  unit: string;
  yieldUsed: number;
  lineCost: number; // تومان (کل این خط برای یک پخت)
  missingCost: boolean; // اگر قیمت قلم صفر است
}

export interface RecipeCosting {
  lines: LineCost[];
  totalCost: number;      // تومان، کل پخت
  portions: number;
  costPerPortion: number; // تومان
  price: number;          // قیمت فروش فعلی هر پرس
  foodCostPct: number | null;   // null اگر قیمت صفر
  targetFcPct: number;
  suggestedPrice: number; // بر اساس targetFcPct
  hasMissingCosts: boolean;
}

const round = (n: number) => Math.round(n);

/** بهای یک خط رسپی با احتساب افت. */
export function lineCost(item: CostingItem | undefined, line: CostingLine): LineCost {
  if (!item) {
    return { itemId: line.itemId, name: '— حذف‌شده —', qtyBase: line.qtyBase, unit: '', yieldUsed: 100, lineCost: 0, missingCost: true };
  }
  const yieldUsed = line.overridePct ?? item.yieldPct ?? 100;
  const factor = yieldUsed > 0 ? 100 / yieldUsed : 1;
  const cost = line.qtyBase * item.avgCostPerBase * factor;
  return {
    itemId: item.id,
    name: item.name,
    qtyBase: line.qtyBase,
    unit: item.unit,
    yieldUsed,
    lineCost: round(cost),
    missingCost: item.avgCostPerBase <= 0,
  };
}

/** محاسبه‌ی کامل costing یک رسپی. */
export function costRecipe(
  recipe: { portions: number; price: number; targetFcPct: number },
  lines: CostingLine[],
  itemsById: Record<string, CostingItem>
): RecipeCosting {
  const lineCosts = lines.map((l) => lineCost(itemsById[l.itemId], l));
  const totalCost = lineCosts.reduce((s, l) => s + l.lineCost, 0);
  const portions = Math.max(1, recipe.portions);
  const costPerPortion = round(totalCost / portions);
  const price = recipe.price;
  const foodCostPct = price > 0 ? Math.round((costPerPortion / price) * 1000) / 10 : null;
  const target = recipe.targetFcPct > 0 ? recipe.targetFcPct : 30;
  const suggestedPrice = round(costPerPortion / (target / 100));
  return {
    lines: lineCosts,
    totalCost,
    portions,
    costPerPortion,
    price,
    foodCostPct,
    targetFcPct: target,
    suggestedPrice,
    hasMissingCosts: lineCosts.some((l) => l.missingCost),
  };
}

/**
 * بهای هر واحد پایه‌ی یک قلم نیمه‌آماده (prep) از روی رسپی‌اش.
 * خروجی avgCostPerBase که باید روی همان قلم prep ذخیره شود.
 * baseYieldQty = مقدار محصول نهایی (واحد پایه) که یک پخت رسپی تولید می‌کند.
 */
export function costPrepItem(
  lines: CostingLine[],
  itemsById: Record<string, CostingItem>,
  baseYieldQty: number
): number {
  const total = lines.reduce((s, l) => s + lineCost(itemsById[l.itemId], l).lineCost, 0);
  return baseYieldQty > 0 ? total / baseYieldQty : 0;
}
