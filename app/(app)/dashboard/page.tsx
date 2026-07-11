'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, TrendingUp, TrendingDown, Clock, CheckCircle2, Users2 } from 'lucide-react';
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
  DashCard,
  TrendChart,
  TodayCashFlow,
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
 * ترتیب بخش‌ها (فاز hierarchy):
 * ① نبض سیستم  — FlashReportCard + AnomalyBanner (SuperAdmin)
 * ② نیازمند توجه — AttentionWidget
 * ③ تراز مالی   — KPI + حساب‌ها + شرکا
 * ④ عملیاتی     — پرسنل + مقایسه شعب + تفکیک هزینه
 * ⑤ آخرین تراکنش‌ها
 * ⑥ داوطلبان تازه (SuperAdmin، انتهای صفحه)
 */

/** عنوان کوچک بالای هر بخش — یکدست در همه‌جا */
function SectionLabel({ children }: { children: string }) {
  return (
    <div className="text-[11px] font-semibold text-stone-400 tracking-wide uppercase select-none">
      {children}
    </div>
  );
}

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
  const nonZeroBranches = branchSummaryData.filter((b) => b.income > 0 || b.expense > 0);
  const showBranchSummary = isAdmin && !branchFilter && nonZeroBranches.length >= 2;
  const canSeeContacts = canAccessSection(user, 'contacts');
  const canSeeFinance = canAccessSection(user, 'transactions');

  const activeContacts = canSeeContacts ? contacts.filter((c) => c.isActive) : [];
  const partnerCards = activeContacts
    .filter((c) => c.balance !== 0)
    .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
    .slice(0, 6);
  const allPartnersSettled = activeContacts.length > 0 && partnerCards.length === 0;

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* ─── Header ─── */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-semibold text-stone-900 tracking-tight">داشبورد</h1>
            <div className="text-[12px] text-stone-500 mt-0.5">
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
            ① نبض سیستم (SuperAdmin)
            ══════════════════════════════════════════════════════════════ */}
        {isAdmin && (
          <div className="space-y-3">
            <SectionLabel>نبض سیستم</SectionLabel>
            <FlashReportCard />
            <TodayCashFlow branchId={branchFilter ?? undefined} />
            <AnomalyBanner />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            ② نیازمند توجه
            ══════════════════════════════════════════════════════════════ */}
        {!isOperational && (
          <div className="space-y-3">
            <SectionLabel>نیازمند توجه</SectionLabel>
            <AttentionWidget />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            ③ تراز مالی — KPI + حساب‌ها + شرکا
            ══════════════════════════════════════════════════════════════ */}
        {!isOperational && canSeeFinance && (
          <div className="space-y-4">
            <SectionLabel>تراز مالی</SectionLabel>

            {/* KPI grid — ۴ کارت هم‌ارتفاع */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
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

            {/* نمودار ۱۴ روزه */}
            <TrendChart branchId={branchFilter ?? undefined} />

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

            {/* وضعیت شرکا */}
            {canSeeContacts && activeContacts.length > 0 && (
              <DashCard
                title="وضعیت شرکا"
                icon={Users2}
                iconBg="bg-violet-50"
                iconColor="text-violet-600"
                onViewAll={() => router.push('/contacts')}
                bodyClass={allPartnersSettled ? 'p-4' : 'p-4'}
              >
                {allPartnersSettled ? (
                  <div className="flex items-center gap-2 text-[12.5px] text-emerald-700">
                    <CheckCircle2 size={14} strokeWidth={1.75} className="shrink-0" />
                    <span>همه‌ی طرف‌حساب‌ها تسویه‌اند</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {partnerCards.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => router.push('/contacts')}
                        className="bg-stone-50 hover:bg-stone-100 rounded-lg px-4 py-3 text-right transition-colors"
                      >
                        <div className="text-[11px] text-stone-500 truncate mb-1.5">{c.name}</div>
                        <div
                          className={cn(
                            'text-[15px] font-semibold tabular-nums leading-none',
                            c.balance > 0 ? 'text-emerald-700' : 'text-rose-700',
                          )}
                          title={`${fmt(c.balance)} تومان`}
                        >
                          {formatMoneyShort(c.balance)}
                        </div>
                        <div className={cn(
                          'text-[10px] mt-1',
                          c.balance > 0 ? 'text-emerald-600' : 'text-rose-600',
                        )}>
                          {c.balance > 0 ? 'بستانکار' : 'بدهکار'}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </DashCard>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            ④ عملیاتی — پرسنل + مقایسه شعب + تفکیک هزینه
            ══════════════════════════════════════════════════════════════ */}
        {!isOperational && canSeeFinance && (
          <div className="space-y-4">
            <SectionLabel>عملیات</SectionLabel>

            <HRSummaryCard />

            {showBranchSummary && (
              <BranchSummary
                data={nonZeroBranches}
                onBranchClick={(id) => {
                  setBranchFilter(id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}

            {metrics.filtered.length > 0 && breakdownForCard.length >= 2 && (
              <BreakdownCard
                title="تفکیک هزینه"
                subtitle={`${breakdownForCard.length} دسته`}
                tone="expense"
                data={breakdownForCard}
              />
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            ⑤ آخرین تراکنش‌ها
            ══════════════════════════════════════════════════════════════ */}
        {!isOperational && canSeeFinance && (
          metrics.filtered.length > 0 ? (
            <div className="space-y-3">
              <SectionLabel>آخرین تراکنش‌ها</SectionLabel>
              <RecentList transactions={metrics.filtered} limit={6} />
            </div>
          ) : (
            <div className="text-center text-[12px] text-muted py-8">
              هنوز هیچ تراکنشی برای نمایش وجود ندارد.
            </div>
          )
        )}

        {/* ══════════════════════════════════════════════════════════════
            ⑥ داوطلبان تازه (SuperAdmin — انتهای صفحه)
            ══════════════════════════════════════════════════════════════ */}
        {isAdmin && (
          <div className="space-y-3">
            <SectionLabel>استخدام</SectionLabel>
            <RecruitmentWidget />
          </div>
        )}

      </div>
    </div>
  );
}
