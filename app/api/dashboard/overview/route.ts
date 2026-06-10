import { NextResponse } from 'next/server';
import { eq, and, lte, sql, desc, gt } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { canAccessSection } from '@/lib/auth/permissions';
import { handleError } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/overview
 *
 * «داشبورد یکپارچه» — یک endpoint سبک و تجمیعی که سه حوزه‌ی جدا
 * (انبار، فروش/مالی، حقوق و پرسنل) را در یک نگاه برای مدیریت کنار هم می‌گذارد.
 * عمداً aggregate-only است (نه لیست‌های کامل) تا payload کوچک بماند؛
 * برای جزئیات بیشتر کاربر به صفحه‌ی همان حوزه می‌رود.
 *
 * RBAC: مثل سایر aggregateها، scope بر اساس شعبه‌ی کاربر اعمال می‌شود
 * (BranchUser فقط داده‌ی شعبه‌ی خودش، SuperAdmin همه یا یک شعبه‌ی انتخابی via ?branchId=).
 */
export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const qBranchId = searchParams.get('branchId');

    const branchId = session.role === 'BranchUser'
      ? session.branchId
      : (qBranchId || null);

    const branchTxFilter = branchId ? eq(schema.transactions.branchId, branchId) : undefined;
    const branchItemFilter = branchId ? eq(schema.invItems.branchId, branchId) : undefined;
    const branchEmpFilter = branchId ? eq(schema.employees.branchId, branchId) : undefined;

    // RBAC: هر بخش فقط در صورتی که کاربر به آن دسترسی دارد محاسبه/برگردانده می‌شود
    const canInventory = canAccessSection(session, 'inventory');
    const canFinance = canAccessSection(session, 'transactions');
    const canHr = canAccessSection(session, 'payroll') || canAccessSection(session, 'employees');

    // ── ۱) هشدار/وضعیت انبار: اقلام زیر حداقل موجودی ──
    const lowStockRows = canInventory ? await db.select({
      id: schema.invItems.id,
      name: schema.invItems.name,
      unit: schema.invItems.unit,
      qtyBase: schema.invItems.qtyBase,
      minBase: schema.invItems.minBase,
    }).from(schema.invItems)
      .where(and(
        branchItemFilter,
        eq(schema.invItems.isActive, true),
        gt(schema.invItems.minBase, '0'),
        lte(schema.invItems.qtyBase, schema.invItems.minBase),
      ))
      .orderBy(schema.invItems.name)
      .limit(8) : [];

    const [pendingVouchersRow] = canInventory ? await db.select({ count: sql<number>`count(*)::int` })
      .from(schema.invVouchers)
      .where(and(
        branchId ? eq(schema.invVouchers.branchId, branchId) : undefined,
        eq(schema.invVouchers.status, 'pending'),
      )) : [{ count: 0 }];

    // ── ۲) فعالیت مالی اخیر: تراکنش‌های تأییدشده‌ی اخیر + جمع امروز ──
    const recentTx = canFinance ? await db.select({
      id: schema.transactions.id,
      type: schema.transactions.type,
      amount: schema.transactions.amount,
      title: schema.transactions.title,
      createdAt: schema.transactions.createdAt,
    }).from(schema.transactions)
      .where(and(branchTxFilter, eq(schema.transactions.status, 'approved')))
      .orderBy(desc(schema.transactions.createdAt))
      .limit(6) : [];

    const [pendingTxRow] = canFinance ? await db.select({ count: sql<number>`count(*)::int` })
      .from(schema.transactions)
      .where(and(branchTxFilter, eq(schema.transactions.status, 'pending'))) : [{ count: 0 }];

    // ── ۳) وضعیت سریع پرسنل/حقوق ──
    const [activeEmpRow] = canHr ? await db.select({ count: sql<number>`count(*)::int` })
      .from(schema.employees)
      .where(and(branchEmpFilter, eq(schema.employees.isActive, true))) : [{ count: 0 }];

    const [latestRun] = canHr ? await db.select({
      id: schema.payrollRuns.id,
      periodYearMonth: schema.payrollRuns.periodYearMonth,
      status: schema.payrollRuns.status,
      branchName: schema.payrollRuns.branchName,
    }).from(schema.payrollRuns)
      .orderBy(desc(schema.payrollRuns.createdAt))
      .limit(1) : [null as any];

    return NextResponse.json({
      branchId,
      inventory: {
        lowStockItems: lowStockRows.map((r) => ({
          id: r.id, name: r.name, unit: r.unit,
          qtyBase: Number(r.qtyBase), minBase: Number(r.minBase),
        })),
        lowStockCount: lowStockRows.length,
        pendingVouchers: pendingVouchersRow?.count ?? 0,
      },
      finance: {
        recentTransactions: recentTx.map((t) => ({
          id: t.id, type: t.type, amount: t.amount, title: t.title,
          createdAt: t.createdAt.toISOString(),
        })),
        pendingTransactions: pendingTxRow?.count ?? 0,
      },
      hr: {
        activeEmployees: activeEmpRow?.count ?? 0,
        latestPayrollRun: latestRun ? {
          id: latestRun.id,
          periodYearMonth: latestRun.periodYearMonth,
          status: latestRun.status,
          branchName: latestRun.branchName,
        } : null,
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
