import { NextResponse } from 'next/server';
import { eq, and, or, sql, gte, lte, desc, inArray, isNull, notInArray } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';

/**
 * GET /api/reports
 *
 * Server-side aggregation — همه محاسبات در PostgreSQL انجام می‌شود.
 * Client فقط داده‌های خلاصه‌شده دریافت می‌کند، نه هزاران ردیف raw.
 *
 * Query params:
 *   branchId?     — فیلتر شعبه (SuperAdmin)
 *   from?         — تاریخ شروع جلالی (مقایسه‌ی رشته‌ای مستقیم)
 *   to?           — تاریخ پایان جلالی
 *   excludeSetup? — '1' → حذف دسته‌های is_setup=true از محاسبات (نمای عملیاتی)
 */

const querySchema = z.object({
  branchId: z.string().uuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  excludeSetup: z.enum(['1', 'true']).optional(),
});

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const url = new URL(req.url);

    const params = querySchema.parse({
      branchId: url.searchParams.get('branchId') ?? undefined,
      from: url.searchParams.get('from') ?? undefined,
      to: url.searchParams.get('to') ?? undefined,
      excludeSetup: url.searchParams.get('excludeSetup') ?? undefined,
    });

    const operationalMode = !!params.excludeSetup;

    // ─── Build WHERE conditions ────────────────────────────────────
    const conditions = [
      eq(schema.transactions.status, 'approved'),
    ];

    // RBAC scope — باید قبل از محاسبه‌ی setupExcludedExpense اضافه شود
    if (session.role === 'BranchUser' && session.branchId) {
      conditions.push(eq(schema.transactions.branchId, session.branchId));
    } else if (session.role === 'SuperAdmin' && params.branchId) {
      conditions.push(eq(schema.transactions.branchId, params.branchId));
    }

    // فیلتر بر اساس تاریخ شمسی سند (نه زمان ثبت سیستم). مقایسه‌ی رشته‌ای روی YYYY/MM/DD درست است.
    if (params.from) conditions.push(gte(schema.transactions.date, params.from));
    if (params.to) conditions.push(lte(schema.transactions.date, params.to));

    // در نمای عملیاتی: دسته‌های is_setup=true از جریان‌های مالی حذف می‌شوند
    // ⚠ موجودی حساب‌ها (accounts.balance) هرگز تحت تأثیر این فیلتر قرار نمی‌گیرد
    let setupExcludedExpense = 0;
    if (operationalMode) {
      const setupCats = await db
        .select({ id: schema.categories.id })
        .from(schema.categories)
        .where(eq(schema.categories.isSetup, true));

      if (setupCats.length > 0) {
        const setupIds = setupCats.map(c => c.id);

        // مجموع هزینه‌های حذف‌شده — همان فیلترهای RBAC و تاریخ، محدود به دسته‌های راه‌اندازی
        const [excluded] = await db
          .select({
            total: sql<string>`COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0)`,
          })
          .from(schema.transactions)
          .where(and(...conditions, inArray(schema.transactions.categoryId, setupIds)));
        setupExcludedExpense = Number(excluded?.total ?? 0);

        // حذف تراکنش‌های دسته‌ی راه‌اندازی از محاسبات اصلی
        // categoryId IS NULL = انتقال وجه (مجاز) ؛ NOT IN setupIds = تراکنش عملیاتی (مجاز)
        conditions.push(
          or(isNull(schema.transactions.categoryId), notInArray(schema.transactions.categoryId, setupIds))!
        );
      }
    }

    const where = and(...conditions);

    // ─── ۱. KPI totals ─────────────────────────────────────────────
    const [totals] = await db
      .select({
        totalIncome: sql<string>`COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0)`,
        totalExpense: sql<string>`COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)`,
        txCount: sql<string>`COUNT(*)`,
      })
      .from(schema.transactions)
      .where(where);

    const income = Number(totals?.totalIncome ?? 0);
    const expense = Number(totals?.totalExpense ?? 0);

    // ─── ۲. Monthly aggregation ────────────────────────────────────
    // از date field که Jalali string است، ماه را extract می‌کنیم
    // فرمت: ۱۴۰۵/۰۲/۳۱ → substring(6,2) = '۰۲'
    // چون ارقام فارسی هستند، از created_at (Gregorian) برای sort استفاده می‌کنیم
    const monthlyRaw = await db
      .select({
        month: sql<string>`TO_CHAR(created_at AT TIME ZONE 'Asia/Tehran', 'YYYY-MM')`,
        income: sql<string>`COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0)`,
        expense: sql<string>`COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)`,
        count: sql<string>`COUNT(*)`,
      })
      .from(schema.transactions)
      .where(where)
      .groupBy(sql`TO_CHAR(created_at AT TIME ZONE 'Asia/Tehran', 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(created_at AT TIME ZONE 'Asia/Tehran', 'YYYY-MM') ASC`)
      .limit(24); // حداکثر ۲ سال

    const MONTH_FA: Record<string, string> = {
      '01': 'فروردین', '02': 'اردیبهشت', '03': 'خرداد',
      '04': 'تیر', '05': 'مرداد', '06': 'شهریور',
      '07': 'مهر', '08': 'آبان', '09': 'آذر',
      '10': 'دی', '11': 'بهمن', '12': 'اسفند',
    };

    const monthly = monthlyRaw.map(r => {
      const [year, mon] = r.month.split('-');
      return {
        key: r.month,
        month: `${MONTH_FA[mon ?? '01'] ?? mon} ${year?.slice(2)}`,
        income: Number(r.income),
        expense: Number(r.expense),
        balance: Number(r.income) - Number(r.expense),
        count: Number(r.count),
      };
    });

    // ─── ۳. Branch aggregation (SuperAdmin only) ──────────────────
    let byBranch: Array<{ id: string; name: string; income: number; expense: number; balance: number }> = [];
    if (session.role === 'SuperAdmin') {
      const branchRaw = await db
        .select({
          branchId: schema.transactions.branchId,
          branchName: schema.transactions.branchName,
          income: sql<string>`COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0)`,
          expense: sql<string>`COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)`,
        })
        .from(schema.transactions)
        .where(where)
        .groupBy(schema.transactions.branchId, schema.transactions.branchName)
        .orderBy(desc(sql`SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) - SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END)`));

      byBranch = branchRaw.map(r => ({
        id: r.branchId,
        name: r.branchName,
        income: Number(r.income),
        expense: Number(r.expense),
        balance: Number(r.income) - Number(r.expense),
      }));
    }

    // ─── ۴. Category breakdown ────────────────────────────────────
    const categoryRaw = await db
      .select({
        name: schema.transactions.categoryName,
        type: schema.transactions.type,
        total: sql<string>`COALESCE(SUM(amount), 0)`,
        count: sql<string>`COUNT(*)`,
      })
      .from(schema.transactions)
      .where(where)
      .groupBy(schema.transactions.categoryName, schema.transactions.type)
      .orderBy(desc(sql`SUM(amount)`))
      .limit(20);

    const byCategory = categoryRaw.map(r => ({
      name: r.name || 'انتقال وجه',
      type: r.type,
      total: Number(r.total),
      count: Number(r.count),
    }));

    // ─── ۵. User performance (SuperAdmin) ────────────────────────
    let byUser: Array<{ userId: string; name: string; approved: number; pending: number; rejected: number; total: number }> = [];
    if (session.role === 'SuperAdmin') {
      const userRaw = await db
        .select({
          userId: schema.transactions.createdBy,
          userName: schema.users.name,
          approved: sql<string>`COUNT(CASE WHEN ${schema.transactions.status} = 'approved' THEN 1 END)`,
          pending: sql<string>`COUNT(CASE WHEN ${schema.transactions.status} = 'pending' THEN 1 END)`,
          rejected: sql<string>`COUNT(CASE WHEN ${schema.transactions.status} = 'rejected' THEN 1 END)`,
          total: sql<string>`COALESCE(SUM(CASE WHEN ${schema.transactions.status} = 'approved' THEN amount ELSE 0 END), 0)`,
        })
        .from(schema.transactions)
        .innerJoin(schema.users, eq(schema.transactions.createdBy, schema.users.id))
        .groupBy(schema.transactions.createdBy, schema.users.name)
        .orderBy(desc(sql`COUNT(CASE WHEN ${schema.transactions.status} = 'approved' THEN 1 END)`));

      byUser = userRaw.map(r => ({
        userId: r.userId,
        name: r.userName,
        approved: Number(r.approved),
        pending: Number(r.pending),
        rejected: Number(r.rejected),
        total: Number(r.total),
      }));
    }

    // ─── ۶. صورت سود و زیان (P&L) ──────────────────────────────────
    // COGS: دسته 'بهای تمام‌شده (COGS)' — ثبت خودکار هنگام approve فروش
    // Payroll: دسته 'حقوق پرسنل' — ثبت خودکار از post حقوق
    const [plTotals] = await db
      .select({
        cogs: sql<string>`COALESCE(SUM(CASE WHEN type='expense' AND category_name='بهای تمام‌شده (COGS)' THEN amount ELSE 0 END),0)`,
        payroll: sql<string>`COALESCE(SUM(CASE WHEN type='expense' AND category_name='حقوق پرسنل' THEN amount ELSE 0 END),0)`,
      })
      .from(schema.transactions)
      .where(where);

    const cogs = Number(plTotals?.cogs ?? 0);
    const payroll = Number(plTotals?.payroll ?? 0);
    const grossProfit = income - cogs;
    const otherExpense = expense - cogs - payroll;

    // ─── ۷. سفارش‌های بیرون‌بر (تکمیل‌شده) — تعداد، فروش، میانگین سبد، نسبت ارسال/پیکاپ ──
    const orderConditions = [inArray(schema.orders.status, ['delivered', 'completed'])];
    if (session.role === 'BranchUser' && session.branchId) {
      orderConditions.push(eq(schema.orders.branchId, session.branchId));
    } else if (session.role === 'SuperAdmin' && params.branchId) {
      orderConditions.push(eq(schema.orders.branchId, params.branchId));
    }
    if (params.from) orderConditions.push(gte(schema.orders.jalaliDate, params.from));
    if (params.to) orderConditions.push(lte(schema.orders.jalaliDate, params.to));

    const [orderTotals] = await db
      .select({
        count: sql<string>`COUNT(*)`,
        totalSales: sql<string>`COALESCE(SUM(${schema.orders.total}), 0)`,
        deliveryCount: sql<string>`COUNT(CASE WHEN ${schema.orders.serviceType} = 'delivery' THEN 1 END)`,
        pickupCount: sql<string>`COUNT(CASE WHEN ${schema.orders.serviceType} = 'pickup' THEN 1 END)`,
      })
      .from(schema.orders)
      .where(and(...orderConditions));

    const takeawayCount = Number(orderTotals?.count ?? 0);
    const takeawaySales = Number(orderTotals?.totalSales ?? 0);

    return NextResponse.json({
      summary: {
        income,
        expense,
        balance: income - expense,
        count: Number(totals?.txCount ?? 0),
        setupExcludedExpense,
      },
      pl: {
        revenue: income,
        cogs,
        grossProfit,
        payroll,
        otherExpense,
        netProfit: grossProfit - payroll - otherExpense,
      },
      monthly,
      byBranch,
      byCategory,
      byUser,
      takeaway: {
        count: takeawayCount,
        totalSales: takeawaySales,
        avgBasket: takeawayCount > 0 ? Math.round(takeawaySales / takeawayCount) : 0,
        deliveryCount: Number(orderTotals?.deliveryCount ?? 0),
        pickupCount: Number(orderTotals?.pickupCount ?? 0),
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
