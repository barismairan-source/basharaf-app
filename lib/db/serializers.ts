import { schema } from './client';

type TransactionRow = typeof schema.transactions.$inferSelect;

/**
 * BigInt → Number conversion.
 * PostgreSQL bigint در Drizzle به‌صورت bigint JS برمی‌گردد.
 * Next.js نمی‌تواند bigint را JSON serialize کند → 500 error.
 * این تابع مطمئن می‌شود amount همیشه Number است.
 */
function toNum(v: bigint | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === 'bigint' ? Number(v) : v;
}

export function rowToTransaction(row: TransactionRow) {
  const base = {
    id: row.id,
    type: row.type,
    title: row.title,
    category: row.categoryId ?? '',
    categoryName: row.categoryName ?? '',
    amount: toNum(row.amount),   // ← BigInt fix
    payee: row.payee,
    branchId: row.branchId,
    branch: row.branchName,
    method: row.method,
    receipt: row.receipt,
    receiptUrl: row.receiptUrl ?? null,
    accountId: row.accountId ?? null,
    destinationAccountId: row.destinationAccountId ?? null,
    contactId: row.contactId ?? null,
    vatAmount: toNum(row.vatAmount),
    isCredit: row.isCredit ?? false,
    date: row.date,
    note: row.note,
    hasReceipt: row.hasReceipt,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdBy: row.createdBy,
  };

  if (row.status === 'approved') {
    return {
      ...base,
      status: 'approved' as const,
      approvedBy: row.approvedBy ?? '',
      approvedAt: row.approvedAt?.toISOString() ?? row.updatedAt.toISOString(),
    };
  }
  if (row.status === 'rejected') {
    return {
      ...base,
      status: 'rejected' as const,
      rejectedBy: row.rejectedBy ?? '',
      rejectedAt: row.rejectedAt?.toISOString() ?? row.updatedAt.toISOString(),
      rejectionReason: row.rejectionReason ?? 'بدون دلیل ذکرشده',
    };
  }
  return { ...base, status: 'pending' as const };
}
