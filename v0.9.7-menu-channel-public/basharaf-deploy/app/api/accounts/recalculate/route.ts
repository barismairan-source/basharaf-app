import { NextResponse } from 'next/server';
import { eq, and, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';

/**
 * POST /api/accounts/recalculate
 * بازسازی موجودی همه حساب‌ها از روی تراکنش‌های approved.
 */
export async function POST() {
  try {
    await requireAdmin();
    const accounts = await db.select().from(schema.accounts);

    for (const account of accounts) {
      const [inc] = await db.select({ t: sql<string>`COALESCE(SUM(amount),0)` })
        .from(schema.transactions)
        .where(and(eq(schema.transactions.accountId, account.id), eq(schema.transactions.status, 'approved'), eq(schema.transactions.type, 'income')));
      const [exp] = await db.select({ t: sql<string>`COALESCE(SUM(amount),0)` })
        .from(schema.transactions)
        .where(and(eq(schema.transactions.accountId, account.id), eq(schema.transactions.status, 'approved'), eq(schema.transactions.type, 'expense')));
      const [tOut] = await db.select({ t: sql<string>`COALESCE(SUM(amount),0)` })
        .from(schema.transactions)
        .where(and(eq(schema.transactions.accountId, account.id), eq(schema.transactions.status, 'approved'), eq(schema.transactions.type, 'transfer')));
      const [tIn] = await db.select({ t: sql<string>`COALESCE(SUM(amount),0)` })
        .from(schema.transactions)
        .where(and(eq(schema.transactions.destinationAccountId, account.id), eq(schema.transactions.status, 'approved'), eq(schema.transactions.type, 'transfer')));

      const balance = Number(inc?.t ?? 0) - Number(exp?.t ?? 0) - Number(tOut?.t ?? 0) + Number(tIn?.t ?? 0);
      await db.update(schema.accounts).set({ balance, updatedAt: new Date() })
        .where(eq(schema.accounts.id, account.id));
    }

    const updated = await db.select().from(schema.accounts);
    return NextResponse.json({
      ok: true,
      accounts: updated.map(a => ({ id: a.id, name: a.name, balance: Number(a.balance) })),
    });
  } catch (e) {
    return handleError(e);
  }
}
