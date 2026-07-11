import { NextRequest, NextResponse } from 'next/server';
import { and, eq, gte, inArray, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';
import { getTodayJalali } from '@/lib/jalali';

export const dynamic = 'force-dynamic';

export interface TrendDay {
  date: string;  // jalali string
  income: number;
  expense: number;
}

export interface TrendsData {
  days: TrendDay[];       // آرایه‌ی تا ۱۴ روز، مرتب از قدیم به جدید
  todayIncome: number;    // درآمد تأییدشده‌ی امروز
  todayExpense: number;   // هزینه‌ی تأییدشده‌ی امروز
}

/** GET /api/dashboard/trends?branchId=<uuid>
 * یک query گروه‌بندی‌شده روی تراکنش‌های ۱۴ روز اخیر (بر اساس created_at).
 */
export async function GET(req: NextRequest) {
  try {
    await requireSession();

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId') ?? undefined;

    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const conds = [
      eq(schema.transactions.status, 'approved'),
      gte(schema.transactions.createdAt, since),
      inArray(schema.transactions.type, ['income', 'expense']),
    ];
    if (branchId) conds.push(eq(schema.transactions.branchId, branchId));

    const rows = await db
      .select({
        date: schema.transactions.date,
        income: sql<string>`COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0)`,
        expense: sql<string>`COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0)`,
      })
      .from(schema.transactions)
      .where(and(...conds))
      .groupBy(schema.transactions.date)
      .orderBy(schema.transactions.date);

    const days: TrendDay[] = rows.map((r) => ({
      date: r.date,
      income: Number(r.income),
      expense: Number(r.expense),
    }));

    const today = getTodayJalali();
    const todayRow = days.find((d) => d.date === today);

    return NextResponse.json({
      days,
      todayIncome: todayRow?.income ?? 0,
      todayExpense: todayRow?.expense ?? 0,
    } satisfies TrendsData);
  } catch (e) {
    return handleError(e);
  }
}
