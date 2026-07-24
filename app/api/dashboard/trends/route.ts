import { NextResponse } from 'next/server';
import { and, eq, gte, lte, inArray, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';
import { getTodayJalali, jalaliToDate, dateToJalali } from '@/lib/jalali';

export const dynamic = 'force-dynamic';

export interface TrendDay {
  date: string;  // jalali string
  income: number;
  expense: number;
}

export interface TrendsData {
  days: TrendDay[];       // از قدیم به جدید، طول = پارامتر days
  todayIncome: number;    // درآمد تأییدشده‌ی امروز
  todayExpense: number;   // هزینه‌ی تأییدشده‌ی امروز
  /** مجموع بازه‌ی هم‌طولِ بلافاصله قبل — برای «نسبت به دوره‌ی قبل» */
  previousTotal: { income: number; expense: number } | null;
}

const ALLOWED_DAYS = [7, 14, 30, 90] as const;

async function sumRange(fromJalali: string, toJalali: string, branchId: string | null) {
  const conds = [
    eq(schema.transactions.status, 'approved'),
    inArray(schema.transactions.type, ['income', 'expense']),
    gte(schema.transactions.date, fromJalali),
    lte(schema.transactions.date, toJalali),
  ];
  if (branchId) conds.push(eq(schema.transactions.branchId, branchId));
  const [row] = await db
    .select({
      income: sql<string>`COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0)`,
      expense: sql<string>`COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0)`,
    })
    .from(schema.transactions)
    .where(and(...conds));
  return { income: Number(row?.income ?? 0), expense: Number(row?.expense ?? 0) };
}

/**
 * GET /api/dashboard/trends?branchId=<uuid>&days=7|14|30|90
 *
 * RBAC: SuperAdmin هر branchId درخواستی (یا هیچ‌کدام = همه) را می‌بیند؛
 * BranchUser/Warehouse/Chef همیشه فقط شعبه‌ی نشست خودشان — قبلاً این route
 * هیچ enforcement‌ی نداشت (فقط احراز هویت را چک می‌کرد، نه شعبه را)، یعنی
 * یک BranchUser با فرستادن ?branchId دلخواه می‌توانست روند شعبه‌ی دیگر را
 * ببیند. رفع شد.
 */
export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);

    const requestedBranchId = searchParams.get('branchId');
    const branchId = session.role === 'SuperAdmin' ? requestedBranchId : session.branchId;

    const daysParam = Number(searchParams.get('days') ?? 14);
    const days = (ALLOWED_DAYS as readonly number[]).includes(daysParam) ? daysParam : 14;

    const today = getTodayJalali();
    const todayDate = jalaliToDate(today)!;
    const fromDate = new Date(todayDate.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    const fromJalali = dateToJalali(fromDate);

    const conds = [
      eq(schema.transactions.status, 'approved'),
      gte(schema.transactions.date, fromJalali),
      lte(schema.transactions.date, today),
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

    const days_: TrendDay[] = rows.map((r) => ({
      date: r.date,
      income: Number(r.income),
      expense: Number(r.expense),
    }));

    const todayRow = days_.find((d) => d.date === today);

    // بازه‌ی هم‌طولِ قبلی — برای مقایسه
    const prevToDate = new Date(fromDate.getTime() - 24 * 60 * 60 * 1000);
    const prevFromDate = new Date(prevToDate.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    const previousTotal = await sumRange(dateToJalali(prevFromDate), dateToJalali(prevToDate), branchId ?? null);

    return NextResponse.json({
      days: days_,
      todayIncome: todayRow?.income ?? 0,
      todayExpense: todayRow?.expense ?? 0,
      previousTotal,
    } satisfies TrendsData);
  } catch (e) {
    return handleError(e);
  }
}
