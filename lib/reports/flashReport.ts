import { and, eq, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { jalaliToDate, dateToJalali } from '@/lib/jalali';

export interface FlashReportData {
  date: string;
  revenue: number;
  invoiceCount: number;
  cogs: number;
  primeCostPct: number | null;
  wasteTotal: number;
  lastWeekRevenue: number | null;
  lastWeekCogs: number | null;
  revenuePctChange: number | null;
  cogsPctChange: number | null;
}

function txWhere(date: string, branchId?: string) {
  const conds = [eq(schema.transactions.status, 'approved'), eq(schema.transactions.date, date)];
  if (branchId) conds.push(eq(schema.transactions.branchId, branchId));
  return and(...conds);
}

function wasteWhere(date: string, branchId?: string) {
  const conds = [
    eq(schema.invVouchers.kind, 'waste'),
    eq(schema.invVouchers.status, 'approved'),
    eq(schema.invVouchers.makerDate, date),
  ];
  if (branchId) conds.push(eq(schema.invVouchers.branchId, branchId));
  return and(...conds);
}

async function queryDay(dateJalali: string, branchId?: string) {
  const [tx] = await db
    .select({
      revenue: sql<string>`COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0)`,
      cogs: sql<string>`COALESCE(SUM(CASE WHEN type='expense' AND category_name='بهای تمام‌شده (COGS)' THEN amount ELSE 0 END),0)`,
      payroll: sql<string>`COALESCE(SUM(CASE WHEN type='expense' AND category_name='حقوق پرسنل' THEN amount ELSE 0 END),0)`,
      invoiceCount: sql<string>`COUNT(CASE WHEN type='income' THEN 1 END)`,
    })
    .from(schema.transactions)
    .where(txWhere(dateJalali, branchId));

  const [waste] = await db
    .select({
      total: sql<string>`COALESCE(SUM(COALESCE(final_total, est_total)),0)`,
    })
    .from(schema.invVouchers)
    .where(wasteWhere(dateJalali, branchId));

  return {
    revenue: Number(tx?.revenue ?? 0),
    cogs: Number(tx?.cogs ?? 0),
    payroll: Number(tx?.payroll ?? 0),
    invoiceCount: Number(tx?.invoiceCount ?? 0),
    wasteTotal: Number(waste?.total ?? 0),
  };
}

export async function getFlashReport(dateJalali: string, branchId?: string): Promise<FlashReportData> {
  const todayDate = jalaliToDate(dateJalali);
  let lastWeekJalali: string | null = null;
  if (todayDate) {
    const lw = new Date(todayDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    lastWeekJalali = dateToJalali(lw);
  }

  const today = await queryDay(dateJalali, branchId);
  const lastWeek = lastWeekJalali ? await queryDay(lastWeekJalali, branchId) : null;

  const primeCost = today.cogs + today.payroll;
  const primeCostPct = today.revenue > 0 ? Math.round((primeCost / today.revenue) * 100) : null;

  const revenuePctChange =
    lastWeek && lastWeek.revenue > 0
      ? Math.round(((today.revenue - lastWeek.revenue) / lastWeek.revenue) * 100)
      : null;
  const cogsPctChange =
    lastWeek && lastWeek.cogs > 0
      ? Math.round(((today.cogs - lastWeek.cogs) / lastWeek.cogs) * 100)
      : null;

  return {
    date: dateJalali,
    revenue: today.revenue,
    invoiceCount: today.invoiceCount,
    cogs: today.cogs,
    primeCostPct,
    wasteTotal: today.wasteTotal,
    lastWeekRevenue: lastWeek?.revenue ?? null,
    lastWeekCogs: lastWeek?.cogs ?? null,
    revenuePctChange,
    cogsPctChange,
  };
}
