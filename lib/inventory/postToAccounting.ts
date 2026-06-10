import { eq, and } from 'drizzle-orm';
import { schema } from '@/lib/db/client';
import { applyBalance, reverseBalance } from '@/lib/db/balanceHelpers';

/**
 * اتصال انبار ↔ حسابداری.
 *
 * وقتی برگه‌ی خرید (kind='in') تأیید می‌شود، یک تراکنش هزینه‌ی واقعی در هسته
 * می‌سازد و موجودی صندوق را کم می‌کند — تا انبار جزیره‌ی جدا نباشد.
 *
 * - idempotent: اگر برگه از قبل linkedTransactionId دارد، دوباره نمی‌سازد.
 * - حساب: اولین حساب فعالِ شعبه‌ی برگه (یا اولین حساب فعال کلی).
 * - باید داخل همان db.transaction تأیید برگه صدا زده شود (dbTx پاس داده می‌شود).
 */
export async function postPurchaseToAccounting(
  dbTx: any,
  voucher: { id: string; no: string; branchId: string | null; makerDate: string; linkedTransactionId: string | null },
  totalAmount: number,
  userId: string,
): Promise<string | null> {
  // فقط مبلغ مثبت
  if (totalAmount <= 0) return null;
  // idempotency — اگر قبلاً وصل شده
  if (voucher.linkedTransactionId) return voucher.linkedTransactionId;

  // پیدا کردن یک حساب برای کسر — اولویت با حساب شعبه
  let account: { id: string } | undefined;
  if (voucher.branchId) {
    const [a] = await dbTx.select().from(schema.accounts)
      .where(and(eq(schema.accounts.branchId, voucher.branchId), eq(schema.accounts.isActive, true)))
      .limit(1);
    account = a;
  }
  if (!account) {
    const [a] = await dbTx.select().from(schema.accounts)
      .where(eq(schema.accounts.isActive, true)).limit(1);
    account = a;
  }
  // اگر هیچ حسابی نیست، تراکنش بدون حساب می‌سازیم (روی موجودی اثر ندارد)
  const accountId = account?.id ?? null;

  let branchName = '';
  if (voucher.branchId) {
    const [b] = await dbTx.select().from(schema.branches)
      .where(eq(schema.branches.id, voucher.branchId)).limit(1);
    branchName = b?.name ?? '';
  }

  const [coreTx] = await dbTx.insert(schema.transactions).values({
    type: 'expense',
    title: `خرید مواد اولیه — برگه ${voucher.no}`,
    categoryId: null,
    categoryName: 'خرید مواد اولیه',
    amount: totalAmount,
    payee: 'انبار',
    branchId: voucher.branchId,
    branchName,
    method: 'انبار',
    accountId,
    vatAmount: 0,
    isCredit: false,
    date: voucher.makerDate,
    note: `ثبت خودکار از انبار — برگه خرید ${voucher.no}`,
    status: 'approved',
    createdBy: userId,
    approvedBy: userId,
    approvedAt: new Date(),
  }).returning();
  if (!coreTx) throw new Error('ساخت تراکنش هزینه‌ی خرید ناموفق بود');

  // اثر روی موجودی صندوق (expense → کم می‌شود)
  if (accountId) await applyBalance(dbTx, coreTx);

  // وصل برگه به تراکنش
  await dbTx.update(schema.invVouchers)
    .set({ linkedTransactionId: coreTx.id })
    .where(eq(schema.invVouchers.id, voucher.id));

  return coreTx.id;
}

/**
 * معکوس: هنگام رد/حذف برگه‌ی خرید تأییدشده، تراکنش مرتبط را هم برمی‌گرداند.
 */
export async function reversePurchasePost(dbTx: any, voucherId: string): Promise<void> {
  const [v] = await dbTx.select().from(schema.invVouchers)
    .where(eq(schema.invVouchers.id, voucherId)).limit(1);
  if (!v?.linkedTransactionId) return;
  const [tx] = await dbTx.select().from(schema.transactions)
    .where(eq(schema.transactions.id, v.linkedTransactionId)).limit(1);
  if (tx) {
    if (tx.accountId) await reverseBalance(dbTx, tx);
    await dbTx.delete(schema.transactions).where(eq(schema.transactions.id, tx.id));
  }
  await dbTx.update(schema.invVouchers)
    .set({ linkedTransactionId: null })
    .where(eq(schema.invVouchers.id, voucherId));
}

/**
 * ضایعات (kind='waste') → سند هزینه‌ی ضایعات در حسابداری (بدون اثر روی صندوق).
 *
 * issueConfirmed همان لحظه‌ی approve، انبار را به‌بهای میانگین موزون «بستانکار»
 * می‌کند (qtyBase کم می‌شود)؛ این فقط طرف «بدهکار» را در دفاتر می‌نویسد —
 * دقیقاً مثل سند COGS خودکار فروش منو (یک نوشته‌ی صرفاً دفترداری، بدون نقدینگی).
 * idempotent با linkedTransactionId. باید داخل همان db.transaction تأیید برگه صدا زده شود.
 */
export async function postWasteToAccounting(
  dbTx: any,
  voucher: { id: string; no: string; branchId: string | null; makerDate: string; linkedTransactionId: string | null },
  totalAmount: number,
  userId: string,
): Promise<string | null> {
  if (totalAmount <= 0) return null;
  if (voucher.linkedTransactionId) return voucher.linkedTransactionId;

  let branchName = '';
  if (voucher.branchId) {
    const [b] = await dbTx.select().from(schema.branches).where(eq(schema.branches.id, voucher.branchId)).limit(1);
    branchName = b?.name ?? '';
  }

  const [coreTx] = await dbTx.insert(schema.transactions).values({
    type: 'expense',
    title: `ضایعات انبار — برگه ${voucher.no}`,
    categoryId: null,
    categoryName: 'ضایعات انبار (Waste Expense)',
    amount: totalAmount,
    payee: 'انبار',
    branchId: voucher.branchId,
    branchName,
    method: 'انبار',
    accountId: null, // فقط دفترداری — انبار قبلاً به بهای میانگین موزون بستانکار شده؛ این سند فقط بدهکار را می‌نویسد
    vatAmount: 0,
    isCredit: false,
    date: voucher.makerDate,
    note: `ثبت خودکار از انبار — ضایعات ${voucher.no} (بستانکار: انبار به میانگین موزون / بدهکار: هزینه‌ی ضایعات)`,
    status: 'approved',
    createdBy: userId,
    approvedBy: userId,
    approvedAt: new Date(),
  }).returning();
  if (!coreTx) throw new Error('ساخت تراکنش هزینه‌ی ضایعات ناموفق بود');

  await dbTx.update(schema.invVouchers)
    .set({ linkedTransactionId: coreTx.id })
    .where(eq(schema.invVouchers.id, voucher.id));

  return coreTx.id;
}

/**
 * فروش روزانه (kind='sale') → سند درآمد در حسابداری + افزایش موجودی صندوق.
 * idempotent با linkedTransactionId. داخل همان db.transaction تأیید صدا زده شود.
 */
export async function postSaleToAccounting(
  dbTx: any,
  voucher: { id: string; no: string; branchId: string | null; makerDate: string; linkedTransactionId: string | null },
  revenue: number,
  userId: string,
): Promise<string | null> {
  if (revenue <= 0) return null;
  if (voucher.linkedTransactionId) return voucher.linkedTransactionId;

  let account: { id: string } | undefined;
  if (voucher.branchId) {
    const [a] = await dbTx.select().from(schema.accounts)
      .where(and(eq(schema.accounts.branchId, voucher.branchId), eq(schema.accounts.isActive, true))).limit(1);
    account = a;
  }
  if (!account) {
    const [a] = await dbTx.select().from(schema.accounts).where(eq(schema.accounts.isActive, true)).limit(1);
    account = a;
  }
  const accountId = account?.id ?? null;

  let branchName = '';
  if (voucher.branchId) {
    const [b] = await dbTx.select().from(schema.branches).where(eq(schema.branches.id, voucher.branchId)).limit(1);
    branchName = b?.name ?? '';
  }

  const [coreTx] = await dbTx.insert(schema.transactions).values({
    type: 'income',
    title: `فروش روزانه — برگه ${voucher.no}`,
    categoryId: null,
    categoryName: 'فروش غذا',
    amount: revenue,
    payee: 'فروش',
    branchId: voucher.branchId,
    branchName,
    method: 'فروش',
    accountId,
    vatAmount: 0,
    isCredit: false,
    date: voucher.makerDate,
    note: `ثبت خودکار از انبار — فروش روزانه ${voucher.no}`,
    status: 'approved',
    createdBy: userId,
    approvedBy: userId,
    approvedAt: new Date(),
  }).returning();
  if (!coreTx) throw new Error('ساخت تراکنش درآمد فروش ناموفق بود');

  if (accountId) await applyBalance(dbTx, coreTx);

  await dbTx.update(schema.invVouchers)
    .set({ linkedTransactionId: coreTx.id })
    .where(eq(schema.invVouchers.id, voucher.id));

  return coreTx.id;
}
