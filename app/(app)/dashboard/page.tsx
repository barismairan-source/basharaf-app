'use client';

import { useEffect, useMemo, useState } from 'react';
import { Wallet, TrendingUp, TrendingDown, Clock, Landmark } from 'lucide-react';
import { useAppStore } from '@/store';
import {
  KPICard,
  BranchPicker,
  BreakdownCard,
  BranchSummary,
  RecentList,
  DashboardSkeleton,
  UnifiedOverview,
  OperationsStrip,
} from '@/components/dashboard';
import { useDashboardMetrics } from '@/lib/hooks/useDashboardMetrics';
import {
  SPARK_BALANCE,
  SPARK_INCOME,
  SPARK_EXPENSE,
  SPARK_PENDING,
} from '@/lib/sparklines';
import { fmt } from '@/lib/utils';

/**
 * Dashboard — صفحه اصلی اپلیکیشن بعد از login.
 *
 * ساختار:
 *   1. Header با عنوان + BranchPicker (فقط SuperAdmin)
 *   2. KPI grid (۴ کارت: موجودی، درآمد، هزینه، در انتظار)
 *   3. تفکیک هزینه (BreakdownCard)
 *   4. آخرین تراکنش‌ها (RecentList)
 *   5. مقایسه شعب (فقط SuperAdmin، فقط وقتی branchFilter null)
 *
 * یک نکته مهم درباره hydration:
 * - Zustand persist در server side دسترسی به localStorage ندارد، پس user اولیه null است
 * - بعد از hydration در client، user populate می‌شود
 * - اگر در حین این فاصله render کنیم، یک flash خالی می‌بینیم
 * - راه‌حل: تا hydration کامل نشود، DashboardSkeleton نمایش می‌دهیم
 */
export default function DashboardPage() {
  const user = useAppStore((s) => s.user);
  const branches = useAppStore((s) => s.branches);
  const transactions = useAppStore((s) => s.transactions);
  const accounts = useAppStore((s) => s.accounts);
  const branchFilter = useAppStore((s) => s.branchFilter);
  const setBranchFilter = useAppStore((s) => s.setBranchFilter);
  const metrics = useDashboardMetrics();

  const totalAccountBalance = useMemo(
    () => accounts.reduce((sum, a) => sum + a.balance, 0),
    [accounts]
  );

  // ─── Hydration tracking ───
  // در اولین render پس از mount، Zustand هنوز از localStorage hydrate نشده.
  // برای جلوگیری از flash، تا اولین useEffect صفحه را skeleton نشان می‌دهیم.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  // ─── BranchSummary data (فقط برای SuperAdmin بدون branchFilter) ───
  const branchSummaryData = useMemo(() => {
    if (!user || user.role !== 'SuperAdmin' || branchFilter) return [];
    return branches.map((b) => {
      const branchTxs = transactions.filter(
        (t) => t.branchId === b.id && t.status === 'approved'
      );
      let income = 0;
      let expense = 0;
      for (const t of branchTxs) {
        if (t.type === 'income') income += t.amount;
        else expense += t.amount;
      }
      return {
        branchId: b.id,
        branchName: b.name,
        income,
        expense,
        balance: income - expense,
      };
    });
  }, [user, branches, transactions, branchFilter]);

  if (!hydrated || !user) {
    return <DashboardSkeleton />;
  }

  // adapter: تبدیل expenseBreakdown از hook به شکلی که BreakdownCard می‌خواهد
  const breakdownForCard = metrics.expenseBreakdown.map((item) => ({
    category: item.name,
    amount: item.amount,
    percent: item.percent,
  }));

  const isAdmin = user.role === 'SuperAdmin';
  const showBranchSummary = isAdmin && !branchFilter;

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ─── Header ─── */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-medium text-stone-900 tracking-tight">
              داشبورد
            </h1>
            <div className="text-[12px] text-stone-500 mt-1">
              {isAdmin
                ? branchFilter
                  ? `نمایش: ${
                      branches.find((b) => b.id === branchFilter)?.name ?? '—'
                    }`
                  : 'نمایش: همه شعب'
                : `شعبه: ${
                    branches.find((b) => b.id === user.assignedBranch)?.name ??
                    '—'
                  }`}
            </div>
          </div>

          {/* BranchPicker فقط برای SuperAdmin */}
          {isAdmin && <BranchPicker />}
        </div>

        {/* ─── داشبورد یکپارچه: انبار + فروش/مالی + پرسنل/حقوق در یک نگاه ─── */}
        <UnifiedOverview />

        {/* ─── میانبر عملیات: PO باز / تجهیزات در تعمیر / وظایف امروزِ ناتمام ─── */}
        <OperationsStrip />

        {/* ─── KPI grid ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            tone="balance"
            label="موجودی (تراکنش‌ها)"
            value={metrics.balance}
            icon={Wallet}
            spark={SPARK_BALANCE}
            highlightNegative
          />
          <KPICard
            tone="income"
            label="مجموع درآمد"
            value={metrics.income}
            icon={TrendingUp}
            spark={SPARK_INCOME}
          />
          <KPICard
            tone="expense"
            label="مجموع هزینه"
            value={metrics.expense}
            icon={TrendingDown}
            spark={SPARK_EXPENSE}
          />
          <KPICard
            tone="pending"
            label={`در انتظار (${new Intl.NumberFormat('fa-IR').format(
              metrics.pendingCount
            )} مورد)`}
            value={metrics.pendingAmount}
            icon={Clock}
            spark={SPARK_PENDING}
          />
        </div>

        {/* ─── Accounts quick summary ─── */}
        {accounts.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {accounts.slice(0, 4).map(a => (
              <div key={a.id} className="bg-white border border-stone-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Landmark size={12} strokeWidth={1.5} className="text-stone-400" />
                  <span className="text-[10.5px] text-stone-500 truncate">{a.name}</span>
                </div>
                <div className={`text-[16px] font-medium tabular-nums ${a.balance >= 0 ? 'text-stone-900' : 'text-rose-700'}`}>
                  {fmt(a.balance)}
                </div>
                <div className="text-[9.5px] text-stone-400 mt-0.5">تومان</div>
              </div>
            ))}
          </div>
        )}

        {/* ─── Branch summary (SuperAdmin only, no filter) ─── */}
        {showBranchSummary && (
          <BranchSummary
            data={branchSummaryData}
            onBranchClick={(id) => {
              setBranchFilter(id);
              // اسکرول به بالا تا KPI کارت‌ها با شعبه جدید نمایش داده شوند
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {/* ─── Two-column breakdown + recent ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <BreakdownCard
            title="تفکیک هزینه"
            subtitle={`${breakdownForCard.length} دسته`}
            tone="expense"
            data={breakdownForCard}
          />
          <RecentList transactions={metrics.filtered} limit={6} />
        </div>

        {/* ─── Empty state if absolutely no data ─── */}
        {metrics.filtered.length === 0 && (
          <div className="text-center text-[12px] text-stone-400 py-8">
            هنوز هیچ تراکنشی برای نمایش وجود ندارد.
          </div>
        )}
      </div>
    </div>
  );
}
