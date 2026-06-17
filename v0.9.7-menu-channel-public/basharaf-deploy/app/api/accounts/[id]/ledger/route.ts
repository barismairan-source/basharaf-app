import { NextResponse } from 'next/server';
import { eq, or, and, asc } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';

/**
 * GET /api/accounts/[id]/ledger
 *
 * دفتر کل یک حساب — همه تراکنش‌های approved مرتبط با این صندوق،
 * به‌ترتیب زمانی، با مانده‌ی متحرک (running balance).
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireSession();

    const [account] = await db.select().from(schema.accounts)
      .where(eq(schema.accounts.id, params.id)).limit(1);
    if (!account) throw new ApiError(404, 'حساب پیدا نشد', 'NOT_FOUND');

    // همه تراکنش‌های approved که این حساب مبدا یا مقصد است
    const rows = await db.select().from(schema.transactions)
      .where(and(
        eq(schema.transactions.status, 'approved'),
        or(
          eq(schema.transactions.accountId, params.id),
          eq(schema.transactions.destinationAccountId, params.id)
        )
      ))
      .orderBy(asc(schema.transactions.approvedAt));

    // محاسبه مانده متحرک
    let running = 0;
    const entries = rows.map(r => {
      const amount = Number(r.amount);
      let delta = 0;

      if (r.type === 'income' && r.accountId === params.id) delta = amount;
      else if (r.type === 'expense' && r.accountId === params.id) delta = -amount;
      else if (r.type === 'transfer') {
        if (r.accountId === params.id) delta = -amount;       // خروج
        if (r.destinationAccountId === params.id) delta = amount; // ورود
      }

      running += delta;

      return {
        id: r.id,
        title: r.title,
        type: r.type,
        date: r.date,
        delta,
        balance: running,
        payee: r.payee,
        isIncoming: delta > 0,
      };
    });

    return NextResponse.json({
      account: { id: account.id, name: account.name, balance: Number(account.balance) },
      entries: entries.reverse(), // جدیدترین اول
      currentBalance: running,
    });
  } catch (e) {
    return handleError(e);
  }
}
