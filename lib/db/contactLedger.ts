import { and, eq, desc } from 'drizzle-orm';
import { db, schema } from './client';

/**
 * محاسبه‌ی پویای مانده‌ی طرف‌حساب از روی تراکنش‌های approved.
 *
 * برخلاف contacts.balance (که یک cache denormalized است)، این تابع
 * مانده را از مجموع تراکنش‌های نسیه‌ی تأییدشده محاسبه می‌کند:
 *   درآمد نسیه approved  → مشتری بدهکار شد (+)
 *   هزینه نسیه approved  → ما بدهکار شدیم (−)
 *
 * برای دفتر حساب/statement استفاده می‌شود — نه برای لیست مخاطبان.
 */
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
  runningBalance: number;
}

/**
 * دفتر حساب یک طرف‌حساب — تراکنش‌های نسیه.
 * شامل همه وضعیت‌ها (pending / approved / proforma) برای شفافیت کامل.
 * مانده کل فقط از تراکنش‌های approved محاسبه می‌شود.
 * ردیف‌ها جدیدترین اول برمی‌گردند.
 */
export async function getContactLedger(contactId: string): Promise<{
  entries: ContactLedgerEntry[];
  balance: number;
}> {
  const rows = await db
    .select()
    .from(schema.transactions)
    .where(
      and(
        eq(schema.transactions.contactId, contactId),
        eq(schema.transactions.isCredit, true),
      )
    )
    .orderBy(desc(schema.transactions.createdAt));

  const balance = rows.reduce((sum, r) => {
    if (r.status !== 'approved') return sum;
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
    runningBalance: 0,
  }));

  return { entries, balance };
}
