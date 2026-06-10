import { eq, and } from 'drizzle-orm';
import { schema } from '@/lib/db/client';
import { issueConfirmed } from '@/lib/db/inventoryHelpers';

/**
 * Backflushing — کسر خودکار انبار از روی فروش منو (Batch 3 / Step 3).
 *
 * وقتی یک تراکنش income با saleMeta (که آیتم‌های منو + تعداد را دارد) تأیید می‌شود،
 * این تابع:
 *   ۱. برای هر خط، رسپی متصل به آن menuItem را پیدا می‌کند (inv_recipes.menu_item_id)
 *   ۲. رسپی را expand می‌کند (با احتساب افت/yield هر ماده — overridePct ?? item.yieldPct)
 *   ۳. مقدار واقعی مصرف هر ماده را با میانگین موزون فعلی از انبار کسر می‌کند (issueConfirmed)
 *   ۴. برای هر کسر، رکورد inv_stock_tx (kind='sale') ثبت می‌کند — ردپای حسابرسی
 *   ۵. یک رکورد inv_daily_sales برای گزارش‌گیری می‌سازد
 *
 * این یک حرکت سیستمی است (مثل stocktake/produce) — بدون pending/maker-checker جداگانه،
 * چون منشأ آن یک تراکنش already-approved است.
 *
 * باید داخل همان db.transaction تأیید تراکنش صدا زده شود.
 *
 * @returns مجموع COGS (تومان) — برای ثبت تراکنش هزینه‌ی بهای تمام‌شده‌ی کالای فروخته‌شده
 */

export interface MenuSaleLine {
  menuItemId: string;
  qty: number; // تعداد پرس فروخته‌شده
}

/**
 * یک خط کسر قطعی از انبار — برای ثبت در saleMeta.deductionLines تا در صورت
 * Reverse (حذف تراکنش approved)، بتوان دقیقاً همان مقدار را به انبار بازگرداند
 * (بدون این ردپا، بازگشت کسر انبار غیرممکن/تخمینی می‌شد — منبع «موجودی شبح»).
 */
export interface SaleDeductionLine {
  itemId: string;
  qtyBase: number; // مقدار کسرشده از qty_base (واحد پایه) — برای reverse باید +qtyBase برگردد
  cost: number;    // بهای کسرشده (تومان) — صرفاً برای ردپای حسابرسی reversal
}

export interface MenuSaleDeductionResult {
  totalCogs: number;
  dailySaleLines: Array<{ recipeId: string; name: string; qty: number; cogs: number }>;
  warnings: string[];
  deductionLines: SaleDeductionLine[];
}

const n = (v: unknown): number => {
  if (v == null) return 0;
  const x = typeof v === 'string' ? parseFloat(v) : Number(v);
  return isNaN(x) ? 0 : x;
};

export async function applyMenuSaleDeduction(
  dbTx: any,
  branchId: string,
  jalaliDate: string,
  lines: MenuSaleLine[],
  revenue: number
): Promise<MenuSaleDeductionResult> {
  let totalCogs = 0;
  const dailySaleLines: MenuSaleDeductionResult['dailySaleLines'] = [];
  const warnings: string[] = [];
  const deductionLines: SaleDeductionLine[] = [];

  for (const saleLine of lines) {
    if (!(saleLine.qty > 0)) continue;

    // رسپی متصل به این آیتم منو — اولویت با رسپی همان شعبه، در غیر این صورت رسپی سراسری (branchId=null)
    const recipes = await dbTx.select().from(schema.invRecipes)
      .where(and(eq(schema.invRecipes.menuItemId, saleLine.menuItemId), eq(schema.invRecipes.isActive, true)));
    const recipe = recipes.find((r: any) => r.branchId === branchId) ?? recipes.find((r: any) => r.branchId == null);

    if (!recipe) {
      warnings.push(`برای آیتم منو (${saleLine.menuItemId}) رسپی فعالی متصل نیست — کسر انبار انجام نشد`);
      continue;
    }

    const recipeLines = await dbTx.select().from(schema.invRecipeLines)
      .where(eq(schema.invRecipeLines.recipeId, recipe.id));
    const portions = Math.max(1, recipe.portions || 1);

    let recipeCogs = 0;
    for (const rl of recipeLines) {
      const [item] = await dbTx.select().from(schema.invItems)
        .where(eq(schema.invItems.id, rl.itemId)).limit(1);
      if (!item) { warnings.push(`ماده‌ی رسپی «${recipe.name}» یافت نشد`); continue; }

      // افت: اولویت با override خط، سپس افت ذاتیِ خود ماده — دقیقاً مثل costing.ts (lineCost)
      const yieldUsed = rl.overridePct != null ? n(rl.overridePct) : (n(item.yieldPct) || 100);
      const factor = yieldUsed > 0 ? 100 / yieldUsed : 1;

      // مقدار لازم برای یک پرس × تعداد فروخته‌شده ÷ portions رسپی، با احتساب افت
      const qtyPerSale = (n(rl.qtyBase) / portions) * saleLine.qty * factor;
      if (!(qtyPerSale > 0)) continue;

      // بررسی موجودی پیش از کسر: issueConfirmed به‌صورت ذاتی clamp می‌کند
      // (هرگز qtyBase را منفی نمی‌کند — رفتار مشترک هسته‌ی انبار، عمداً اینجا تغییر
      // داده نشد چون produce/waste/out/stocktake هم به همین رفتار متکی‌اند و تغییرش
      // وسط این batch بدون دیتابیس زنده برای regression-test پرریسک است). اما برای
      // فروش منو (که از یک تراکنش already-approved سرچشمه می‌گیرد و طبق طراحی نباید
      // مسدود شود) این کسری باید به‌صراحت هشدار ثبت شود — وگرنه COGS کمتر از واقعی
      // محاسبه می‌شود و «موجودی شبح» (sold-but-not-deducted) بدون ردپا می‌ماند.
      const available = n(item.qtyBase);
      if (qtyPerSale > available + 1e-6) {
        warnings.push(
          `موجودی «${item.name}» کافی نیست — ${available.toLocaleString('fa-IR')} ${item.unit} موجود ` +
          `در برابر ${qtyPerSale.toLocaleString('fa-IR')} ${item.unit} لازم برای «${recipe.name}» ` +
          `(${saleLine.qty} پرس). فقط مقدار موجود کسر شد (clamp هسته) — نیاز به انبارگردانی/بررسی فوری.`
        );
      }

      const cost = await issueConfirmed(dbTx, item.id, qtyPerSale);
      recipeCogs += cost;
      totalCogs += cost;
      deductionLines.push({ itemId: item.id, qtyBase: qtyPerSale, cost });

      await dbTx.insert(schema.invStockTx).values({
        itemId: item.id,
        kind: 'sale',
        deltaBase: String(-qtyPerSale),
        value: Math.round(cost),
        note: `فروش منو — ${saleLine.qty} پرس`,
        jalaliDate,
      });
    }

    dailySaleLines.push({ recipeId: recipe.id, name: recipe.name, qty: saleLine.qty, cogs: Math.round(recipeCogs) });
  }

  if (dailySaleLines.length > 0) {
    await dbTx.insert(schema.invDailySales).values({
      voucherId: null,
      branchId,
      jalaliDate,
      lines: dailySaleLines,
      totalCogs: Math.round(totalCogs),
      totalRevenue: Math.round(revenue),
    });
  }

  return { totalCogs: Math.round(totalCogs), dailySaleLines, warnings, deductionLines };
}
