import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';

/**
 * توابع سرور-فقط (DB) برای گزارش‌های بازه‌ای داشبورد. توابع خالص انتخاب
 * بازه (resolvePeriod/previousPeriod) در `./periodResolve` هستند — آن فایل
 * هیچ وابستگی به DB ندارد و از کامپوننت‌های 'use client' هم قابل import
 * است؛ اینجا برعکس، فقط باید از API route (سرور) import شود.
 */

export interface BranchCogsWaste {
  branchId: string;
  cogsEstimate: number;
  waste: number;
}

/**
 * COGS تخمینی و ضایعات، به‌تفکیک شعبه، برای یک بازه — برای «مقایسه‌ی شعب».
 *
 * چرا endpoint جدا از `/api/reports`؟ آن route همین بازه را برای income/
 * expense/balance به‌ازای شعبه («byBranch») از قبل درست محاسبه می‌کند — این
 * تابع فقط دو ستون اضافه (COGS، ضایعات) را که آنجا نیست تأمین می‌کند؛
 * صفحه‌ی داشبورد نتیجه‌ی این دو را با کلید branchId ادغام می‌کند، به‌جای
 * این‌که منطق income/expense را دوباره در جای دیگری بازنویسی کند.
 *
 * فیلتر بر اساس ستون متنی `date`/`makerDate` (نه createdAt) — چون فرمت شمسی
 * زیرو-پد ('YYYY/MM/DD' با ارقام فارسی) به‌ترتیب واقعی زمانی هم مرتب
 * می‌شود؛ همان قراردادی که flashReport.ts استفاده می‌کند.
 */
export async function getBranchCogsWaste(params: {
  fromJalali: string;
  toJalali: string;
  branchId?: string | null;
}): Promise<BranchCogsWaste[]> {
  const { fromJalali, toJalali, branchId } = params;

  const cogsConds = [
    eq(schema.transactions.status, 'approved'),
    eq(schema.transactions.type, 'expense'),
    eq(schema.transactions.categoryName, 'بهای تمام‌شده (COGS)'),
    gte(schema.transactions.date, fromJalali),
    lte(schema.transactions.date, toJalali),
  ];
  if (branchId) cogsConds.push(eq(schema.transactions.branchId, branchId));

  const cogsRows = await db
    .select({
      branchId: schema.transactions.branchId,
      total: sql<string>`COALESCE(SUM(amount),0)`,
    })
    .from(schema.transactions)
    .where(and(...cogsConds))
    .groupBy(schema.transactions.branchId);

  const wasteConds = [
    eq(schema.invVouchers.kind, 'waste'),
    eq(schema.invVouchers.status, 'approved'),
    gte(schema.invVouchers.makerDate, fromJalali),
    lte(schema.invVouchers.makerDate, toJalali),
  ];
  if (branchId) wasteConds.push(eq(schema.invVouchers.branchId, branchId));

  const wasteRows = await db
    .select({
      branchId: schema.invVouchers.branchId,
      total: sql<string>`COALESCE(SUM(COALESCE(final_total, est_total)),0)`,
    })
    .from(schema.invVouchers)
    .where(and(...wasteConds))
    .groupBy(schema.invVouchers.branchId);

  const byBranch = new Map<string, BranchCogsWaste>();
  for (const r of cogsRows) {
    byBranch.set(r.branchId, { branchId: r.branchId, cogsEstimate: Number(r.total), waste: 0 });
  }
  // invVouchers.branchId قابل null است (برگه‌های بدون شعبه‌ی مشخص) — این‌ها
  // در مقایسه‌ی شعب جایی برای نسبت‌دادن ندارند، نادیده گرفته می‌شوند.
  for (const r of wasteRows) {
    if (!r.branchId) continue;
    const existing = byBranch.get(r.branchId);
    if (existing) existing.waste = Number(r.total);
    else byBranch.set(r.branchId, { branchId: r.branchId, cogsEstimate: 0, waste: Number(r.total) });
  }
  return Array.from(byBranch.values());
}
