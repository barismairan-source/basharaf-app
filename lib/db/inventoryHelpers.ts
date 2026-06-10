import { eq, sql } from 'drizzle-orm';
import { schema } from './client';

/**
 * Inventory integrity helpers — قلب صحت انبار.
 *
 * هم‌خانواده‌ی balanceHelpers.ts است. همان‌طور که موجودی صندوق فقط با
 * تراکنش approved تغییر می‌کند، موجودی قطعی انبار (qtyBase) و میانگین
 * موزون فقط با برگه‌ی approved تغییر می‌کند.
 *
 * دو لایه:
 *   qtyPhysical → با ثبت انباردار (pending) فوری تغییر می‌کند
 *   qtyBase + avgCostPerBase → فقط با تأیید حسابدار (approved)
 *
 * همه‌ی توابع داخل یک DB transaction (tx) صدا زده می‌شوند تا atomic بمانند.
 *
 * نکته‌ی عددی: ستون‌های numeric در drizzle/postgres به‌صورت string برمی‌گردند.
 * برای محاسبه آن‌ها را Number می‌کنیم؛ هنگام نوشتن، sql عددی می‌فرستیم.
 */

const n = (v: string | number | null | undefined): number =>
  v == null ? 0 : typeof v === 'string' ? parseFloat(v) : v;

type VoucherKind = 'in' | 'out' | 'waste' | 'sale' | 'produce' | 'stocktake';

/* ───────────────────────────────────────────────────────────────
 * لایه‌ی فیزیکی — هنگام ثبت برگه توسط انباردار (pending)
 * جهت: in/produce → +  |  out/waste/sale → −
 * (stocktake مستقیم qtyPhysical را ست می‌کند، جدا هندل می‌شود)
 * ─────────────────────────────────────────────────────────────── */
function physicalSign(kind: VoucherKind): 1 | -1 | 0 {
  if (kind === 'in' || kind === 'produce') return 1;
  if (kind === 'out' || kind === 'waste' || kind === 'sale') return -1;
  return 0;
}

/** اعمال اثر فیزیکی یک خط برگه (sign=+1 ثبت، sign=-1 برگشت هنگام reject) */
export async function applyPhysicalLine(
  tx: any,
  itemId: string,
  qtyBase: number,
  kind: VoucherKind,
  sign: 1 | -1
): Promise<void> {
  const dir = physicalSign(kind);
  if (dir === 0) return;
  const delta = sign * dir * qtyBase;
  await tx.update(schema.invItems)
    .set({ qtyPhysical: sql`GREATEST(0, qty_physical + ${delta})`, updatedAt: new Date() })
    .where(eq(schema.invItems.id, itemId));
}

/* ───────────────────────────────────────────────────────────────
 * لایه‌ی قطعی — هنگام تأیید حسابدار (approved)
 * ─────────────────────────────────────────────────────────────── */

/** ورود قطعی با میانگین موزون. totalCost به تومان، qtyBase واحد پایه. */
export async function receiveConfirmed(
  tx: any,
  itemId: string,
  qtyBase: number,
  totalCost: number
): Promise<void> {
  if (!(qtyBase > 0)) return;
  const [it] = await tx.select({
    q: schema.invItems.qtyBase,
    a: schema.invItems.avgCostPerBase,
  }).from(schema.invItems).where(eq(schema.invItems.id, itemId));
  if (!it) return;

  const oldQty = n(it.q);
  const oldAvg = n(it.a);
  const oldVal = oldQty * oldAvg;
  const newQty = oldQty + qtyBase;
  const newAvg = newQty > 0 ? (oldVal + totalCost) / newQty : 0;

  await tx.update(schema.invItems)
    .set({ qtyBase: String(newQty), avgCostPerBase: String(newAvg), updatedAt: new Date() })
    .where(eq(schema.invItems.id, itemId));
}

/**
 * خروج قطعی با میانگین موزون فعلی. مقدار هزینه‌ی خارج‌شده را برمی‌گرداند (تومان).
 * بیش از موجودی خارج نمی‌شود (clamp).
 */
export async function issueConfirmed(
  tx: any,
  itemId: string,
  qtyBase: number
): Promise<number> {
  if (!(qtyBase > 0)) return 0;
  const [it] = await tx.select({
    q: schema.invItems.qtyBase,
    a: schema.invItems.avgCostPerBase,
  }).from(schema.invItems).where(eq(schema.invItems.id, itemId));
  if (!it) return 0;

  const have = n(it.q);
  const avg = n(it.a);
  const q = Math.min(qtyBase, have);
  const cost = q * avg;

  await tx.update(schema.invItems)
    .set({ qtyBase: String(have - q), updatedAt: new Date() })
    .where(eq(schema.invItems.id, itemId));
  return cost;
}

/* ───────────────────────────────────────────────────────────────
 * گردش کامل تأیید/رد یک برگه (atomic) — معادل applyBalance هسته
 * این توابع باید درون db.transaction صدا زده شوند.
 * ─────────────────────────────────────────────────────────────── */

type VoucherLine = {
  itemId: string;
  qtyBase: number;
  estUnitCost: number;
  finalUnitCost?: number | null;
};

/**
 * تأیید برگه: اثر فیزیکی موقت را برمی‌گرداند، سپس اثر قطعی را اعمال می‌کند.
 * (این برگشت‌سپس‌اعمال، باگ دوبار-شمارش را حذف می‌کند — مثل reverse/apply هسته.)
 * مقدار finalTotal را برمی‌گرداند (تومان).
 *
 * - kind='in' یا 'produce' : ورود با قیمت نهایی (finalUnitCost؛ برای produce
 *   قیمت از جمع مواد محاسبه‌شده می‌آید و در finalUnitCost ست می‌شود).
 * - kind='out'/'waste'/'sale' : خروج با میانگین موزون فعلی.
 */
export async function approveVoucherTx(
  tx: any,
  kind: VoucherKind,
  lines: VoucherLine[]
): Promise<number> {
  let finalTotal = 0;

  // انبارگردانی: qtyBase هر خط = موجودی شمرده‌شده. اختلاف با سیستم را تعدیل می‌کنیم.
  // (فیزیکی موقت در ثبت اعمال نشده، پس reverse هم لازم نیست.)
  if (kind === 'stocktake') {
    for (const l of lines) {
      await stocktakeConfirmed(tx, l.itemId, l.qtyBase);
    }
    return 0;
  }

  // ۱) برگشت اثر فیزیکی موقت (که هنگام ثبت اعمال شده بود)
  for (const l of lines) {
    await applyPhysicalLine(tx, l.itemId, l.qtyBase, kind, -1);
  }

  // ۲) اعمال اثر قطعی
  if (kind === 'in' || kind === 'produce') {
    for (const l of lines) {
      const unit = l.finalUnitCost ?? l.estUnitCost;
      const cost = unit * l.qtyBase;
      finalTotal += cost;
      await receiveConfirmed(tx, l.itemId, l.qtyBase, cost);
    }
  } else if (kind === 'out' || kind === 'waste' || kind === 'sale') {
    for (const l of lines) {
      finalTotal += await issueConfirmed(tx, l.itemId, l.qtyBase);
    }
  }

  return Math.round(finalTotal);
}

/**
 * رد برگه: فقط اثر فیزیکی موقت را برمی‌گرداند (قطعی هرگز اعمال نشده بود).
 */
export async function rejectVoucherTx(
  tx: any,
  kind: VoucherKind,
  lines: VoucherLine[]
): Promise<void> {
  for (const l of lines) {
    await applyPhysicalLine(tx, l.itemId, l.qtyBase, kind, -1);
  }
}

/* ───────────────────────────────────────────────────────────────
 * تولید نیمه‌آماده — مواد خام خارج، نیمه‌آماده وارد (atomic)
 * بهای هر واحد نیمه‌آماده = جمع بهای مواد خام ÷ مقدار تولید
 * ─────────────────────────────────────────────────────────────── */
export async function produceConfirmed(
  tx: any,
  prepItemId: string,
  batches: number
): Promise<{ producedBase: number; totalCost: number }> {
  const [prep] = await tx.select().from(schema.invItems)
    .where(eq(schema.invItems.id, prepItemId));
  if (!prep || prep.kind !== 'prep' || !prep.prepRecipe) {
    return { producedBase: 0, totalCost: 0 };
  }
  const recipe = prep.prepRecipe as Array<{ itemId: string; qtyBase: number }>;
  const b = Math.max(1, batches);

  // خروج مواد خام با میانگین موزون — با احتساب افت (yieldPct) دقیقاً مثل menuSaleDeduction.
  // qtyBase در prepRecipe مقدار خالص (net) است؛ برای کسر فیزیکی باید به مقدار ناخالص (gross)
  // تبدیل شود: gross = qtyBase × (100 / yieldPct).
  let totalCost = 0;
  for (const r of recipe) {
    const [rawItem] = await tx.select({ yieldPct: schema.invItems.yieldPct })
      .from(schema.invItems).where(eq(schema.invItems.id, r.itemId)).limit(1);
    const yieldPct = n(rawItem?.yieldPct) || 100;
    const factor = yieldPct > 0 ? 100 / yieldPct : 1;
    totalCost += await issueConfirmed(tx, r.itemId, r.qtyBase * b * factor);
  }

  // ورود نیمه‌آماده
  const producedBase = n(prep.batchYieldBase) * b;
  await receiveConfirmed(tx, prepItemId, producedBase, totalCost);

  return { producedBase, totalCost: Math.round(totalCost) };
}

/* ───────────────────────────────────────────────────────────────
 * انبارگردانی — تطبیق موجودی قطعی با شمارش فیزیکی (atomic)
 * مغایرت مثبت = مازاد (ورود) ، منفی = کسری (خروج)
 * ─────────────────────────────────────────────────────────────── */
export async function stocktakeConfirmed(
  tx: any,
  itemId: string,
  countedBase: number
): Promise<{ diff: number }> {
  const [it] = await tx.select({
    q: schema.invItems.qtyBase,
    a: schema.invItems.avgCostPerBase,
  }).from(schema.invItems).where(eq(schema.invItems.id, itemId));
  if (!it) return { diff: 0 };

  const sysQty = n(it.q);
  const avg = n(it.a);
  const diff = countedBase - sysQty;
  if (Math.abs(diff) < 1e-6) return { diff: 0 };

  if (diff > 0) {
    // مازاد: با میانگین فعلی وارد می‌شود (میانگین تغییر نمی‌کند)
    await receiveConfirmed(tx, itemId, diff, diff * avg);
  } else {
    await issueConfirmed(tx, itemId, -diff);
  }
  // فیزیکی هم با قطعی هم‌تراز شود
  await tx.update(schema.invItems)
    .set({ qtyPhysical: String(countedBase), updatedAt: new Date() })
    .where(eq(schema.invItems.id, itemId));

  return { diff };
}
