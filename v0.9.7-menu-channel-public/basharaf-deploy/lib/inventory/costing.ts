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
 * بهای هر واحد پایه‌ی یک قلم نیمه‌آماده (prep) از روی رسپی‌اش — تک‌لایه.
 * فرض می‌کند avgCostPerBase همه‌ی قلم‌های ورودی (raw یا prep) از قبل درست است.
 * خروجی avgCostPerBase که باید روی همان قلم prep ذخیره شود.
 * baseYieldQty = مقدار محصول نهایی (واحد پایه) که یک پخت رسپی تولید می‌کند.
 *
 * توجه: برای زنجیره‌ی نیمه‌آماده‌های تو در تو (prep-of-prep) از
 * `resolvePrepCostChain` استفاده کنید — این تابع فقط یک لایه را حساب می‌کند
 * و برای سازگاری با کدهای قبلی نگه داشته شده.
 */
export function costPrepItem(
  lines: CostingLine[],
  itemsById: Record<string, CostingItem>,
  baseYieldQty: number
): number {
  const total = lines.reduce((s, l) => s + lineCost(itemsById[l.itemId], l).lineCost, 0);
  return baseYieldQty > 0 ? total / baseYieldQty : 0;
}

/* ───────────────────────────────────────────────────────────────
 * زنجیره‌ی چندلایه‌ی نیمه‌آماده (prep-of-prep)
 *
 * مشکل تک‌لایه: اگر «سس» خودش از «آبگوشت» (یک نیمه‌آماده‌ی دیگر) ساخته شود،
 * costPrepItem برای «سس» به avgCostPerBase ذخیره‌شده‌ی «آبگوشت» اعتماد می‌کند —
 * که ممکن است قدیمی/نادرست باشد. این بخش بهای همه‌ی لایه‌ها را از پایین
 * (مواد خام) به بالا، به‌صورت بازگشتی و با تشخیص حلقه، تازه محاسبه می‌کند.
 * ─────────────────────────────────────────────────────────────── */

export interface PrepNode {
  id: string;
  /** خطوط دستور تولید این نیمه‌آماده (مواد ورودی + مقدار هر بَچ) */
  lines: CostingLine[];
  /** مقدار محصول نهایی (واحد پایه) که یک پخت تولید می‌کند */
  baseYieldQty: number;
  /**
   * درصد افت/بازده ذاتیِ خود این نیمه‌آماده (مثلاً افت در مرحله‌ی پخت/برش این پرپ).
   * باید مثل مواد خام در محاسبه‌ی بهای زنجیره لحاظ شود — وگرنه افت در زنجیره‌های
   * چندلایه (پرپ-روی-پرپ) جمع نمی‌شود (compounding waste).
   */
  yieldPct: number;
}

export interface ResolvedPrepCost {
  itemId: string;
  /** بهای تازه‌محاسبه‌شده‌ی هر واحد پایه (با احتساب کل زنجیره) */
  avgCostPerBase: number;
  /** عمق این نیمه‌آماده در زنجیره (۰ = برگ، فقط مواد خام مستقیم) */
  depth: number;
  /** اگر در محاسبه به قلم گم‌شده/بی‌قیمت یا حلقه برخورد شد */
  hasMissingCosts: boolean;
  /** اگر این قلم در یک حلقه (self-reference زنجیره‌ای) قرار دارد */
  hasCycle: boolean;
}

/**
 * بهای کل زنجیره‌ی یک نیمه‌آماده را به‌صورت بازگشتی حل می‌کند.
 *
 * - rawItemsById: مواد خامی که avgCostPerBase ثابت/فعلی‌شان معتبر است.
 * - prepsById: گراف نیمه‌آماده‌ها (می‌توانند به یکدیگر ارجاع دهند).
 * - حلقه (مثلاً A → B → A) شناسایی و AMBIGUOUS علامت‌گذاری می‌شود — نه infinite loop.
 *
 * خروجی: نقشه‌ای از همه‌ی نیمه‌آماده‌های لمس‌شده در زنجیره با بهای تازه و عمق آن‌ها،
 * به‌ترتیبی که می‌توان از پایین به بالا (بیشترین عمق اول) ذخیره/persist کرد.
 */
export function resolvePrepCostChain(
  targetPrepId: string,
  prepsById: Record<string, PrepNode>,
  rawItemsById: Record<string, CostingItem>
): Map<string, ResolvedPrepCost> {
  const resolved = new Map<string, ResolvedPrepCost>();
  const inProgress = new Set<string>(); // برای تشخیص حلقه در مسیر فعلی بازگشت

  function resolve(prepId: string): ResolvedPrepCost {
    const cached = resolved.get(prepId);
    if (cached) return cached;

    const node = prepsById[prepId];
    if (!node) {
      // قلم prep تعریف نشده — نمی‌توان بهایش را حساب کرد
      const fallback: ResolvedPrepCost = {
        itemId: prepId, avgCostPerBase: 0, depth: 0, hasMissingCosts: true, hasCycle: false,
      };
      resolved.set(prepId, fallback);
      return fallback;
    }

    if (inProgress.has(prepId)) {
      // حلقه شناسایی شد: A به‌طور مستقیم/غیرمستقیم به خودش وابسته است
      const cyc: ResolvedPrepCost = {
        itemId: prepId, avgCostPerBase: 0, depth: 0, hasMissingCosts: true, hasCycle: true,
      };
      resolved.set(prepId, cyc);
      return cyc;
    }

    inProgress.add(prepId);

    let total = 0;
    let maxChildDepth = -1;
    let hasMissingCosts = false;
    let hasCycle = false;

    for (const line of node.lines) {
      const raw = rawItemsById[line.itemId];
      if (raw) {
        // ماده‌ی خام: همان منطق lineCost (با افت)
        const lc = lineCost(raw, line);
        total += lc.lineCost;
        if (lc.missingCost) hasMissingCosts = true;
        maxChildDepth = Math.max(maxChildDepth, 0);
        continue;
      }

      // ماده‌ی ورودی خودش یک نیمه‌آماده‌ی دیگر است → بازگشتی حل کن
      const childPrep = prepsById[line.itemId];
      if (childPrep) {
        const childResolved = resolve(line.itemId);
        hasMissingCosts = hasMissingCosts || childResolved.hasMissingCosts;
        hasCycle = hasCycle || childResolved.hasCycle;
        maxChildDepth = Math.max(maxChildDepth, childResolved.depth + 1);

        // افت: اولویت با override خط، در غیر این صورت افت ذاتیِ خود نیمه‌آماده‌ی فرزند
        // (دقیقاً مثل lineCost برای مواد خام) — تا افت در زنجیره‌های چندلایه compound شود.
        const yieldUsed = line.overridePct ?? childPrep.yieldPct ?? 100;
        const factor = yieldUsed > 0 ? 100 / yieldUsed : 1;
        total += line.qtyBase * childResolved.avgCostPerBase * factor;
        continue;
      }

      // نه در مواد خام و نه در نیمه‌آماده‌ها — قلم گم‌شده
      hasMissingCosts = true;
      maxChildDepth = Math.max(maxChildDepth, 0);
    }

    inProgress.delete(prepId);

    const avgCostPerBase = node.baseYieldQty > 0 ? total / node.baseYieldQty : 0;
    const result: ResolvedPrepCost = {
      itemId: prepId,
      avgCostPerBase: hasCycle ? 0 : avgCostPerBase,
      depth: maxChildDepth + 1,
      hasMissingCosts,
      hasCycle,
    };
    resolved.set(prepId, result);
    return result;
  }

  resolve(targetPrepId);
  return resolved;
}

/**
 * ترتیب persist امن: عمیق‌ترین (پایه‌ای‌ترین) نیمه‌آماده‌ها اول ذخیره شوند
 * تا وقتی به والدشان می‌رسیم، avgCostPerBase تازه باشد.
 */
export function chainPersistOrder(resolved: Map<string, ResolvedPrepCost>): ResolvedPrepCost[] {
  return [...resolved.values()]
    .filter((r) => !r.hasCycle)
    .sort((a, b) => b.depth - a.depth);
}

/* ───────────────────────────────────────────────────────────────
 * نوسان قیمت / WAC — بازمحاسبه‌ی خودکار نیمه‌آماده‌های متأثر از خرید
 *
 * وقتی یک رسید ورود (kind='in') تأیید می‌شود، avgCostPerBase ماده‌ی خام
 * با میانگین موزون تغییر می‌کند — اما هر prep که (مستقیم/غیرمستقیم) از آن
 * ماده استفاده می‌کند، avgCostPerBase قدیمی و نادرستی نگه می‌دارد تا کسی
 * دستی «بازمحاسبه» بزند. این تابع همان مسیر resolvePrepCostChain را برای
 * همه‌ی prepهای شعبه (بدون تکرار منطق) صدا می‌زند و فقط مقادیر تغییریافته
 * را persist می‌کند — درست مثل مسیر دستی recost، اما خودکار و atomic.
 * ─────────────────────────────────────────────────────────────── */
export interface AutoRecostDeps {
  /** همه‌ی اقلام raw/prep قابل‌دید برای این شعبه (raw سراسری + prepهای شعبه/سراسری) */
  items: Array<{
    id: string;
    name: string;
    unit: string;
    kind: 'raw' | 'prep';
    avgCostPerBase: number;
    yieldPct: number;
    batchYieldBase: number;
    prepRecipe: Array<{ itemId: string; qtyBase: number; overridePct?: number | null }> | null;
  }>;
}

export interface AutoRecostResult {
  /** prepهایی که avgCostPerBase‌شان واقعاً تغییر کرد و باید persist شوند */
  changed: Array<{ itemId: string; avgCostPerBase: number; depth: number }>;
  hasMissingCosts: boolean;
}

/**
 * فقط محاسبه‌ی خالص (بدون DB) — نتیجه را فراخوان (route) با tx.update persist می‌کند.
 * این جداسازی، تست‌پذیری را حفظ می‌کند و از قاطی‌شدن منطق محاسباتی با I/O جلوگیری می‌کند.
 */
export function computeAutoRecost(deps: AutoRecostDeps): AutoRecostResult {
  const rawItemsById: Record<string, CostingItem> = {};
  const prepsById: Record<string, PrepNode> = {};

  for (const it of deps.items) {
    if (it.kind === 'raw') {
      rawItemsById[it.id] = { id: it.id, name: it.name, unit: it.unit, kind: 'raw', avgCostPerBase: it.avgCostPerBase, yieldPct: it.yieldPct };
    } else if (it.kind === 'prep' && it.prepRecipe) {
      const lines: CostingLine[] = it.prepRecipe.map((r) => ({
        itemId: r.itemId,
        qtyBase: Number(r.qtyBase),
        overridePct: r.overridePct == null ? null : Number(r.overridePct),
      }));
      prepsById[it.id] = { id: it.id, lines, baseYieldQty: it.batchYieldBase, yieldPct: it.yieldPct || 100 };
    }
  }

  const changed: AutoRecostResult['changed'] = [];
  let hasMissingCosts = false;
  const seen = new Set<string>();

  for (const prepId of Object.keys(prepsById)) {
    const resolved = resolvePrepCostChain(prepId, prepsById, rawItemsById);
    for (const r of chainPersistOrder(resolved)) {
      if (seen.has(r.itemId)) continue;
      seen.add(r.itemId);
      const current = prepsById[r.itemId] ? deps.items.find((it) => it.id === r.itemId) : undefined;
      const oldCost = current?.avgCostPerBase ?? 0;
      // فقط اگر واقعاً تغییر کرده persist کن (جلوگیری از نوشتن بی‌مورد)
      if (Math.abs(r.avgCostPerBase - oldCost) > 1e-6) {
        changed.push({ itemId: r.itemId, avgCostPerBase: r.avgCostPerBase, depth: r.depth });
      }
      if (r.hasMissingCosts) hasMissingCosts = true;
    }
  }

  return { changed, hasMissingCosts };
}
