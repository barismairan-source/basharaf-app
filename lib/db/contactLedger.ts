import { and, eq, desc } from 'drizzle-orm';
import { db, schema } from './client';

// مانده فقط از تراکنش‌های نسیه (isCredit=true) و approved محاسبه می‌شود.
// پرداخت نقدی مانده نمی‌سازد — فقط جریان نقدی تاریخی است.
export async function calculateContactBalance(contactId: string): Promise<number> {
  const rows = await db
    .select({
      type: schema.transactions.type,
      amount: schema.transactions.amount,
    })
    .from(schema.transactions)
    .where(
      and(
        eq(schema.transactions.contactId, contactId),
        eq(schema.transactions.status, 'approved'),
        eq(schema.transactions.isCredit, true),
      )
    );

  return rows.reduce((sum, r) => {
    const amt = Number(r.amount);
    return r.type === 'income' ? sum + amt : sum - amt;
  }, 0);
}

export interface ContactLedgerEntry {
  id: string;
  date: string;
  title: string;
  type: string;
  amount: number;
  invoiceCode: string | null;
  status: string;
  isCredit: boolean;
  runningBalance: number;
}

// همه تراکنش‌های طرف‌حساب (نقدی + نسیه) برمی‌گردند برای شفافیت.
// balance فقط از نسیه‌ی approved است.
export async function getContactLedger(contactId: string): Promise<{
  entries: ContactLedgerEntry[];
  balance: number;
}> {
  const rows = await db
    .select()
    .from(schema.transactions)
    .where(eq(schema.transactions.contactId, contactId))
    .orderBy(desc(schema.transactions.createdAt));

  const balance = rows.reduce((sum, r) => {
    if (r.status !== 'approved' || !r.isCredit) return sum;
    const amt = Number(r.amount);
    return r.type === 'income' ? sum + amt : sum - amt;
  }, 0);

  const entries: ContactLedgerEntry[] = rows.map((r) => ({
    id: r.id,
    date: r.date,
    title: r.title,
    type: r.type,
    amount: Number(r.amount),
    invoiceCode: r.invoiceCode ?? null,
    status: r.status,
    isCredit: r.isCredit,
    runningBalance: 0,
  }));

  return { entries, balance };
}
