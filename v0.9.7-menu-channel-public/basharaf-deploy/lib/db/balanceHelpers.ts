import { eq, sql } from 'drizzle-orm';
import { schema } from './client';
import type { SaleDeductionLine } from '@/lib/inventory/menuSaleDeduction';

/**
 * Balance integrity helpers — قلب صحت حسابداری.
 *
 * این توابع تضمین می‌کنند موجودی صندوق‌ها همیشه با تراکنش‌های
 * approved همخوانی داشته باشد.
 *
 * قانون طلایی:
 *   هر تغییر در یک تراکنش approved که amount/account/type را
 *   عوض می‌کند، باید balance را معکوس و دوباره اعمال کند.
 */

type TxLike = {
  type: string;
  amount: number | bigint;
  accountId: string | null;
  destinationAccountId: string | null;
  status: string;
};

/**
 * اعمال اثر یک تراکنش روی موجودی (forward).
 * income: +، expense: -، transfer: مبدا - / مقصد +
 */
export async function applyBalance(tx: any, t: TxLike): Promise<void> {
  const amount = Number(t.amount);
  if (!t.accountId) return;

  if (t.type === 'income') {
    await tx.update(schema.accounts)
      .set({ balance: sql`balance + ${amount}`, updatedAt: new Date() })
      .where(eq(schema.accounts.id, t.accountId));
  } else if (t.type === 'expense') {
    await tx.update(schema.accounts)
      .set({ balance: sql`balance - ${amount}`, updatedAt: new Date() })
      .where(eq(schema.accounts.id, t.accountId));
  } else if (t.type === 'transfer' && t.destinationAccountId) {
    await tx.update(schema.accounts)
      .set({ balance: sql`balance - ${amount}`, updatedAt: new Date() })
      .where(eq(schema.accounts.id, t.accountId));
    await tx.update(schema.accounts)
      .set({ balance: sql`balance + ${amount}`, updatedAt: new Date() })
      .where(eq(schema.accounts.id, t.destinationAccountId));
  }
}

/**
 * معکوس کردن اثر یک تراکنش روی موجودی (reverse).
 * برای DELETE یا EDIT یک تراکنش approved.
 */
export async function reverseBalance(tx: any, t: TxLike): Promise<void> {
  const amount = Number(t.amount);
  if (!t.accountId) return;

  if (t.type === 'income') {
    await tx.update(schema.accounts)
      .set({ balance: sql`balance - ${amount}`, updatedAt: new Date() })
      .where(eq(schema.accounts.id, t.accountId));
  } else if (t.type === 'expense') {
    await tx.update(schema.accounts)
      .set({ balance: sql`balance + ${amount}`, updatedAt: new Date() })
      .where(eq(schema.accounts.id, t.accountId));
  } else if (t.type === 'transfer' && t.destinationAccountId) {
    await tx.update(schema.accounts)
      .set({ balance: sql`balance + ${amount}`, updatedAt: new Date() })
      .where(eq(schema.accounts.id, t.accountId));
    await tx.update(schema.accounts)
      .set({ balance: sql`balance - ${amount}`, updatedAt: new Date() })
      .where(eq(schema.accounts.id, t.destinationAccountId));
  }
}

/**
 * اعمال اثر تراکنش روی موجودی طرف‌حساب (contact).
 *
 * منطق بدهکاری:
 *   income نسیه  → مشتری به ما بدهکار می‌شود (balance +)
 *   expense نسیه → ما به تأمین‌کننده بدهکار می‌شویم (balance -)
 */
export async function applyContactBalance(tx: any, t: {
  type: string; amount: number | bigint; contactId: string | null; isCredit?: boolean;
}): Promise<void> {
  if (!t.contactId || !t.isCredit) return;
  const amount = Number(t.amount);

  if (t.type === 'income') {
    // فروش نسیه — مشتری بدهکار می‌شود
    await tx.update(schema.contacts)
      .set({ balance: sql`balance + ${amount}`, updatedAt: new Date() })
      .where(eq(schema.contacts.id, t.contactId));
  } else if (t.type === 'expense') {
    // خرید نسیه — ما بدهکار می‌شویم
    await tx.update(schema.contacts)
      .set({ balance: sql`balance - ${amount}`, updatedAt: new Date() })
      .where(eq(schema.contacts.id, t.contactId));
  }
}

export async function reverseContactBalance(tx: any, t: {
  type: string; amount: number | bigint; contactId: string | null; isCredit?: boolean;
}): Promise<void> {
  if (!t.contactId || !t.isCredit) return;
  const amount = Number(t.amount);

  if (t.type === 'income') {
    await tx.update(schema.contacts)
      .set({ balance: sql`balance - ${amount}`, updatedAt: new Date() })
      .where(eq(schema.contacts.id, t.contactId));
  } else if (t.type === 'expense') {
    await tx.update(schema.contacts)
      .set({ balance: sql`balance + ${amount}`, updatedAt: new Date() })
      .where(eq(schema.contacts.id, t.contactId));
  }
}

/* ────────────────────────────────────────────────────────────────────────
 * Reverse-on-delete helpers برای فروش منو (saleMeta) — می‌بندند نشتی Bug #1:
 * حذف یک تراکنش approved با saleMeta.deductedAt قبلاً کسر انبار و سند COGS
 * مرتبط را دست‌نخورده رها می‌کرد (موجودی شبح + هزینه‌ی شبح در دفاتر).
 *
 * این دو تابع باید همیشه باهم و درون همان db.transaction حذف صدا زده شوند:
 *   reverseSaleDeduction → برگرداندن مقدار به انبار (atomic، با sql نسبی)
 *   voidCogsTransaction  → ابطال/حذف سند هزینه‌ی COGS تولیدشده در زمان تأیید
 * ──────────────────────────────────────────────────────────────────────── */

type SaleMetaWithDeduction = {
  deductedAt?: string | null;
  deductionLines?: SaleDeductionLine[] | null;
  cogsTransactionId?: string | null;
};

/**
 * بازگرداندن دقیق مقدار کسرشده از انبار به‌هنگام Reverse یک تراکنش approved
 * که قبلاً (در زمان approve) باعث کسر خودکار (backflushing) شده بود.
 *
 * نکات حیاتی:
 *   - باید atomic و امن برای هم‌روندی (concurrency-safe) باشد → از sql نسبی
 *     (`qty_base = qty_base + ${qty}`) استفاده می‌کند، دقیقاً مثل الگوی
 *     applyBalance/reverseBalance — نه read→compute→write.
 *   - فقط روی qty_base اثر می‌گذارد (لایه‌ی قطعی) — میانگین موزون (avg_cost_per_base)
 *     عمداً دست‌نخورده می‌ماند: برگرداندن WAC به مقدار «قبل» نادرست است چون از آن
 *     زمان ممکن است خریدهای دیگری میانگین را تغییر داده باشند؛ مبلغ دقیق کسرشده
 *     در همان زمان (`cost`) به‌عنوان ردپای حسابرسی در inv_stock_tx معکوس ثبت می‌شود.
 *   - برای هر خط، یک رکورد inv_stock_tx معکوس (kind='sale', deltaBase مثبت) ثبت
 *     می‌کند تا ردپای حسابرسی کامل و قابل پیگیری بماند — هیچ رکورد یتیمی نمی‌ماند.
 *   - idempotent در سطح فراخوانی: اگر saleMeta فاقد deductionLines باشد (مثلاً
 *     تراکنش‌های قدیمی‌تر از این تغییر، یا کسر بدون رسپی انجام نشده)، بی‌اثر برمی‌گردد.
 */
export async function reverseSaleDeduction(
  tx: any,
  saleMeta: SaleMetaWithDeduction | null | undefined,
  jalaliDate: string,
): Promise<void> {
  if (!saleMeta?.deductedAt) return;
  const lines = saleMeta.deductionLines;
  if (!lines || !Array.isArray(lines) || lines.length === 0) return;

  for (const line of lines) {
    if (!line?.itemId || !(line.qtyBase > 0)) continue;

    // اعمال اتمیک و امن برای هم‌روندی — برگرداندن مقدار به موجودی قطعی (qty_base)
    await tx.update(schema.invItems)
      .set({ qtyBase: sql`${schema.invItems.qtyBase} + ${line.qtyBase}`, updatedAt: new Date() })
      .where(eq(schema.invItems.id, line.itemId));

    // ردپای حسابرسی معکوس — تا گزارش حرکت موجودی این بازگشت را هم نشان دهد
    await tx.insert(schema.invStockTx).values({
      itemId: line.itemId,
      kind: 'sale',
      deltaBase: String(line.qtyBase),
      value: Math.round(line.cost ?? 0),
      note: 'ابطال فروش منو — بازگشت کسر انبار به‌دلیل حذف تراکنش تأییدشده',
      jalaliDate,
    });
  }
}

/**
 * ابطال سند هزینه‌ی COGS که هنگام approve یک تراکنش فروش منو به‌صورت خودکار
 * ساخته شده بود (یک رکورد دفترداری صرف با accountId=null — هیچ صندوق/طرف‌حسابی
 * را اثر نمی‌گذارد، پس حذف مستقیم آن کاملاً امن است و نیازی به reverseBalance ندارد).
 *
 * idempotent: اگر شناسه‌ی سند در saleMeta نباشد یا قبلاً حذف شده باشد، بی‌اثر است.
 */
export async function voidCogsTransaction(
  tx: any,
  saleMeta: SaleMetaWithDeduction | null | undefined,
): Promise<void> {
  const cogsId = saleMeta?.cogsTransactionId;
  if (!cogsId) return;

  const [cogsTx] = await tx.select({ id: schema.transactions.id, accountId: schema.transactions.accountId })
    .from(schema.transactions).where(eq(schema.transactions.id, cogsId)).limit(1);
  if (!cogsTx) return; // قبلاً حذف شده — idempotent

  // اطمینان دفاعی: سند COGS طبق طراحی باید accountId=null باشد (بدون اثر بر صندوق).
  // اگر به هر دلیلی غیر این بود، حذف کور آن خطرناک است — صرفاً رد می‌شویم و
  // اجازه می‌دهیم مسیر بالادستی (reverseBalance روی خود تراکنش اصلی) کار خودش را بکند.
  if (cogsTx.accountId) return;

  await tx.delete(schema.transactions).where(eq(schema.transactions.id, cogsId));
}
