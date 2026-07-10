'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, TrendingUp, TrendingDown, Clock, ArrowLeft } from 'lucide-react';
import { useAppStore } from '@/store';
import {
  KPICard,
  BranchPicker,
  BreakdownCard,
  BranchSummary,
  RecentList,
  DashboardSkeleton,
  RoleHome,
  FlashReportCard,
  AnomalyBanner,
  AttentionWidget,
  HRSummaryCard,
  RecruitmentWidget,
} from '@/components/dashboard';
import { useDashboardMetrics } from '@/lib/hooks/useDashboardMetrics';
import { fmt } from '@/lib/utils';
import { formatMoneyShort } from '@/lib/design/format';
import { formatBranchName } from '@/lib/design/format';
import { MetricCard } from '@/components/ui';
import { canAccessSection } from '@/lib/auth/permissions';
import { cn } from '@/lib/utils';

/**
 * Dashboard — صفحه‌ی اصلی سیستم.
 *
 * معماری سه‌لایه (فاز ۲):
 *
 * ┌─────────────────────────────────────────────────────┐
 * │ لایه ۱ — نبض سیستم (فقط SuperAdmin)               │
 * │   FlashReportCard + AnomalyBanner (اگر یافته باشد)│
 * ├─────────────────────────────────────────────────────┤
 * │ لایه ۲ — نیازمند توجه (همه‌ی غیر عملیاتی)        │
 * │   AttentionWidget — ادغام OperationsStrip + هشدارها│
 * ├─────────────────────────────────────────────────────┤
 * │ لایه ۳ — تراز مالی و روندها                       │
 * │   KPI cards · حساب‌ها · شرکا · HR · مقایسه شعب   │
 * │   تفکیک هزینه · آخرین تراکنش‌ها                  │
 * └─────────────────────────────────────────────────────┘
 *
 * نکته Hydration: Zustand persist در server side دسترسی به localStorage ندارد.
 * تا hydration کامل نشود، DashboardSkeleton نمایش می‌دهیم تا flash خالی نداشته باشیم.
 */
export default function DashboardPage() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const branches = useAppStore((s) => s.branches);
  const transactions = useAppStore((s) => s.transactions);
  const accounts = useAppStore((s) => s.accounts);
  const contacts = useAppStore((s) => s.contacts);
  const branchFilter = useAppStore((s) => s.branchFilter);
  const setBranchFilter = useAppStore((s) => s.setBranchFilter);
  const metrics = useDashboardMetrics();

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);

  // ─── BranchSummary data (فقط SuperAdmin بدون branchFilter) ───
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
      return { branchId: b.id, branchName: b.name, income, expense, balance: income - expense };
    });
  }, [user, branches, transactions, branchFilter]);

  if (!hydrated || !user) return <DashboardSkeleton />;

  const breakdownForCard = metrics.expenseBreakdown.map((item) => ({
    category: item.name,
    amount: item.amount,
    percent: item.percent,
  }));

  const isAdmin = user.role === 'SuperAdmin';
  const isOperational = user.role === 'Warehouse' || user.role === 'Chef';
  const showBranchSummary = isAdmin && !branchFilter;
  const canSeeContacts = canAccessSection(user, 'contacts');
  const canSeeFinance = canAccessSection(user, 'transactions');

  // شرکا: همه‌ی کانتکت‌های فعال با موجودی غیر صفر، مرتب از بیشترین قدرمطلق
  const partnerCards = canSeeContacts
    ? contacts
        .filter((c) => c.isActive)
        .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
        .slice(0, 6)
    : [];

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ─── Header ─── */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-medium text-stone-900 tracking-tight">داشبورد</h1>
            <div className="text-[12px] text-stone-500 mt-1">
              {isAdmin
                ? branchFilter
                  ? `نمایش: ${formatBranchName(branches.find((b) => b.id === branchFilter) ?? { name: '—' })}`
                  : 'نمایش: همه شعب'
                : `شعبه: ${formatBranchName(branches.find((b) => b.id === user.assignedBranch) ?? { name: '—' })}`}
            </div>
          </div>
          {isAdmin && <BranchPicker />}
        </div>

        {/* ─── نقش‌محور: Warehouse / Chef ─── */}
        {isOperational && <RoleHome role={user.role} />}

        {/* ══════════════════════════════════════════════════════════════
            لایه ۱ — نبض سیستم (فقط SuperAdmin)
            ══════════════════════════════════════════════════════════════ */}
        {isAdmin && (
          <div className="space-y-2">
            <div className="text-[11.5px] text-stone-400 font-medium">نبض سیستم</div>
            <FlashReportCard />
            <AnomalyBanner />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            لایه ۲ — نیازمند توجه شما
            ══════════════════════════════════════════════════════════════ */}
        {!isOperational && (
          <div className="space-y-2">
            <div className="text-[11.5px] text-stone-400 font-medium">اقدامات فوری</div>
            <AttentionWidget />
            {isAdmin && <RecruitmentWidget />}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            لایه ۳ — تراز مالی و روندها
            ══════════════════════════════════════════════════════════════ */}
        {!isOperational && canSeeFinance && (
          <div className="space-y-4">
            <div className="text-[11.5px] text-stone-400 font-medium">تراز مالی</div>

            {/* KPI grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                tone="balance"
                label="موجودی (تراکنش‌ها)"
                value={metrics.balance}
                icon={Wallet}
                highlightNegative
              />
              <KPICard
                tone="income"
                label="مجموع درآمد"
                value={metrics.income}
                icon={TrendingUp}
              />
              <KPICard
                tone="expense"
                label="مجموع هزینه"
                value={metrics.expense}
                icon={TrendingDown}
              />
              <KPICard
                tone="pending"
                label={`در انتظار (${new Intl.NumberFormat('fa-IR').format(metrics.pendingCount)} مورد)`}
                value={metrics.pendingAmount}
                icon={Clock}
              />
            </div>

            {/* حساب‌های بانکی */}
            {accounts.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {accounts.slice(0, 4).map((a) => (
                  <div key={a.id} title={`${fmt(a.balance)} تومان`}>
                    <MetricCard
                      label={a.name}
                      value={a.balance}
                      sparkColor={a.balance >= 0 ? '#15803d' : '#be123c'}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* ─── وضعیت شرکا ─── */}
            {partnerCards.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-[12px] text-stone-600 font-medium">وضعیت شرکا</div>
                  <button
                    type="button"
                    onClick={() => router.push('/contacts')}
                    className="text-[11px] text-stone-400 hover:text-stone-700 transition-colors"
                  >
                    مشاهده همه ←
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {partnerCards.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => router.push('/contacts')}
                      className="bg-white border border-stone-200 rounded-lg p-4 text-right hover:border-stone-300 transition-colors group"
                    >
                      <div className="text-[11px] text-stone-500 truncate mb-1.5">{c.name}</div>
                      <div
                        className={cn(
                          'text-[15px] font-medium tabular-nums leading-none',
                          c.balance > 0 ? 'text-emerald-700' : c.balance < 0 ? 'text-rose-700' : 'text-stone-500'
                        )}
                        title={`${fmt(c.balance)} تومان`}
                      >
                        {formatMoneyShort(Math.abs(c.balance))}
                      </div>
                      <div className={cn(
                        'text-[10px] mt-1',
                        c.balance > 0 ? 'text-emerald-600' : c.balance < 0 ? 'text-rose-600' : 'text-stone-400'
                      )}>
                        {c.balance > 0 ? 'بستانکار' : c.balance < 0 ? 'بدهکار' : 'تسویه'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ─── پرسنل و حقوق ─── */}
            <HRSummaryCard />

            {/* ─── مقایسه شعب (SuperAdmin) ─── */}
            {showBranchSummary && (
              <BranchSummary
                data={branchSummaryData}
                onBranchClick={(id) => {
                  setBranchFilter(id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}

            {/* ─── تفکیک هزینه + آخرین تراکنش‌ها ─── */}
            {metrics.filtered.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <BreakdownCard
                  title="تفکیک هزینه"
                  subtitle={`${breakdownForCard.length} دسته`}
                  tone="expense"
                  data={breakdownForCard}
                />
                <RecentList transactions={metrics.filtered} limit={6} />
              </div>
            ) : (
              <div className="text-center text-[12px] text-muted py-8">
                هنوز هیچ تراکنشی برای نمایش وجود ندارد.
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
