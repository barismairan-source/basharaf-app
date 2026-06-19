import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { ApiError } from '@/lib/api-error';
import { applyBalance, applyContactBalance } from '@/lib/db/balanceHelpers';

/**
 * هسته‌ی مشترک ساخت تراکنش — از POST /api/transactions استخراج شده تا
 * ماژول‌های دیگر (مثل عملیات/تعمیرات) بتوانند بدون تکرار منطق balance،
 * یک تراکنش هسته بسازند. باید درون همان db.transaction فراخوانی‌کننده
 * صدا زده شود (dbTx از بیرون) تا اتمیک بماند.
 */
export interface CreateExpenseTxInput {
  type: 'income' | 'expense' | 'transfer';
  title: string;
  categoryId?: string | null;
  categoryName: string;
  amount: number;
  payee: string;
  branchId: string;
  branchName: string;
  method: string;
  receipt?: string;
  date: string;
  note?: string;
  hasReceipt?: boolean;
  accountId?: string | null;
  destinationAccountId?: string | null;
  contactId?: string | null;
  vatAmount?: number;
  isCredit?: boolean;
  invoiceCode?: string | null;
  /** اگر 'proforma' باشد، تراکنش هیچ اثری روی موجودی یا طرف‌حساب ندارد */
  initialStatus?: 'pending' | 'proforma';
  createdBy: string;
  role: 'SuperAdmin' | 'BranchUser' | 'Warehouse' | 'Chef';
}

export type CreatedExpenseTx = typeof schema.transactions.$inferSelect;

/**
 * status بر اساس نقش: SuperAdmin → approved (و اثر فوری روی balance/contact)،
 * در غیر این صورت → pending (بدون اثر مالی تا زمان approve).
 */
export async function createExpenseTx(dbTx: any, input: CreateExpenseTxInput): Promise<CreatedExpenseTx> {
  const isProforma = input.initialStatus === 'proforma';
  const isAdmin = input.role === 'SuperAdmin';
  const now = new Date();

  // پیش‌فاکتور هیچ اثری روی موجودی/طرف‌حساب ندارد — حتی برای admin
  const finalStatus = isProforma ? 'proforma' : (isAdmin ? 'approved' : 'pending');
  const shouldApprove = !isProforma && isAdmin;

  const [row] = await dbTx.insert(schema.transactions).values({
    type: input.type,
    title: input.title,
    categoryId: input.categoryId || undefined,
    categoryName: input.categoryName,
    amount: input.amount,
    payee: input.payee,
    branchId: input.branchId,
    branchName: input.branchName,
    method: input.method,
    receipt: input.receipt || '—',
    date: input.date,
    note: input.note ?? '',
    hasReceipt: input.hasReceipt ?? false,
    invoiceCode: input.invoiceCode ?? null,
    status: finalStatus,
    createdBy: input.createdBy,
    approvedBy: shouldApprove ? input.createdBy : null,
    approvedAt: shouldApprove ? now : null,
    accountId: input.accountId ?? null,
    destinationAccountId: input.destinationAccountId ?? null,
    contactId: input.contactId ?? null,
    vatAmount: input.vatAmount ?? 0,
    isCredit: input.isCredit ?? false,
  }).returning();

  if (!row) throw new ApiError(500, 'خطا در ثبت تراکنش', 'INSERT_FAILED');

  // اگر approved فوری و account دارد، balance را اعمال کن
  if (shouldApprove && row.accountId) {
    await applyBalance(dbTx, row);
  }
  // اگر نسیه است، balance طرف‌حساب را آپدیت کن
  if (shouldApprove && row.contactId && row.isCredit) {
    await applyContactBalance(dbTx, row);
  }

  return row;
}

/**
 * اعلان SuperAdmin ها برای تراکنش pending — باید بعد از commit شدن
 * db.transaction صدا زده شود (مثل منطق فعلی POST /api/transactions).
 */
export async function notifyPendingTransaction(txId: string, title: string, branchName: string): Promise<void> {
  const admins = await db.select({ id: schema.users.id }).from(schema.users)
    .where(eq(schema.users.role, 'SuperAdmin'));
  if (admins.length === 0) return;
  await db.insert(schema.notifications).values(
    admins.map(admin => ({
      type: 'pending' as const,
      title: 'تراکنش در انتظار بررسی',
      sub: `${title} — ${branchName}`,
      time: 'به‌تازگی',
      read: false,
      txId,
      userId: admin.id,
    }))
  );
}
