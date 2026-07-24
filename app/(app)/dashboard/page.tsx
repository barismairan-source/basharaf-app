'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Users2, Wallet } from 'lucide-react';
import { useAppStore, useVisibleTransactions } from '@/store';
import {
  KPICard,
  BranchPicker,
  BreakdownCard,
  BranchSummary,
  type BranchSummaryRow,
  RecentList,
  DashboardSkeleton,
  RoleHome,
  FlashReportCard,
  AttentionWidget,
  HRSummaryCard,
  RecruitmentWidget,
  DashCard,
  TrendChart,
  DashboardScopeBar,
  FinancialPosition,
  type FinancialPositionData,
  OperationalQueues,
  type DashboardOverviewData,
} from '@/components/dashboard';
import { fmt } from '@/lib/utils';
import { formatMoneyShort, formatBranchName } from '@/lib/design/format';
import { PageShell } from '@/components/ui/PageShell';
import { PageToolbar } from '@/components/ui/PageToolbar';
import { canAccessSection } from '@/lib/auth/permissions';
import { cn } from '@/lib/utils';
import { resolvePeriod, type PeriodKey } from '@/lib/reports/periodResolve';

/**
 * Dashboard — صفحه‌ی اصلی سیستم.
 *
 * معماری اطلاعات (بازطراحی):
 * ⓪ هدر — عنوان + انتخاب شعبه + انتخاب بازه + آخرین به‌روزرسانی + رفرش
 * ① نیازمند توجه — لیست اولویت‌بندی‌شده یا نوار «همه‌چیز مرتب است»
 * ② وضعیت امروز — فروش/فاکتور/میانگین/بهای تمام‌شده/ضایعات/نسبت هزینه مستقیم
 * ③ تراز مالی — جریان خالص دوره (نه موجودی!) + موجودی واقعی حساب‌ها (جدا)
 * ④ روند — نمودار با انتخاب بازه‌ی خودش (۱۴/۳۰/۹۰ روز) + مقایسه با دوره‌ی قبل
 * ⑤ مقایسه شعب — فروش/هزینه/بهای تمام‌شده/ضایعات/جریان خالص
 * ⑥ صف‌های عملیاتی — تأییدهای معلق، برگه‌های انبار، کمبود موجودی، PO باز، تعمیرات، وظایف
 * ⑦ پرسنل و شرکا — خلاصه‌ی HR + داوطلبان تازه + آورده‌ی شرکا
 *
 * تمام aggregateهای مالی (تراز، مقایسه‌ی شعب، تفکیک هزینه) از یک fetch
 * مشترک به `/api/reports` می‌آیند — نه محاسبه‌ی client-side روی کل آرایه‌ی
 * تراکنش‌ها (که با هزاران تراکنش کند و در واقع «بارگذاری همه برای جمع
 * زدن» بود).
 */

/** عنوان کوچک بالای هر بخش — یکدست در همه‌جا */
function SectionLabel({ children }: { children: string }) {
  return (
    <div className="text-[11px] font-semibold text-stone-400 tracking-wide uppercase select-none">
      {children}
    </div>
  );
}

interface ReportsResponse extends FinancialPositionData {
  byBranch: Array<{ id: string; name: string; income: number; expense: number; balance: number }>;
  byCategory: Array<{ name: string; type: string; total: number; count: number }>;
}

interface BranchCogsWasteResponse {
  branches: Array<{ branchId: string; cogsEstimate: number; waste: number }>;
}

const VALID_PERIODS: PeriodKey[] = ['today', '7d', '30d', 'custom'];

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAppStore((s) => s.user);
  const branches = useAppStore((s) => s.branches);
  const visibleTransactions = useVisibleTransactions();
  const accounts = useAppStore((s) => s.accounts);
  const partners = useAppStore((s) => s.partners);
  const partnersLoaded = useAppStore((s) => s.partnersLoaded);
  const loadPartners = useAppStore((s) => s.loadPartners);
  const branchFilter = useAppStore((s) => s.branchFilter);
  const setBranchFilter = useAppStore((s) => s.setBranchFilter);

  const [viewMode, setViewMode] = useState<'operational' | 'full'>('operational');
  const [hydrated, setHydrated] = useState(false);
  const [period, setPeriod] = useState<PeriodKey>('7d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const [reportsData, setReportsData] = useState<ReportsResponse | null>(null);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [branchCogsWaste, setBranchCogsWaste] = useState<BranchCogsWasteResponse['branches'] | null>(null);
  const [overview, setOverview] = useState<DashboardOverviewData | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  // ── hydration اولیه: localStorage (viewMode قدیمی) + URL (شعبه/بازه) ──
  useEffect(() => {
    const savedViewMode = localStorage.getItem('ba-view-mode');
    if (savedViewMode === 'full') setViewMode('full');

    const urlBranch = searchParams.get('branch');
    const urlPeriod = searchParams.get('period') as PeriodKey | null;
    const urlFrom = searchParams.get('from');
    const urlTo = searchParams.get('to');
    if (urlBranch) setBranchFilter(urlBranch);
    if (urlPeriod && VALID_PERIODS.includes(urlPeriod)) setPeriod(urlPeriod);
    if (urlFrom) setCustomFrom(urlFrom);
    if (urlTo) setCustomTo(urlTo);

    setHydrated(true);
    loadPartners();
    // فقط یک‌بار روی mount — تغییرات بعدی period/branchFilter را effect جدا به URL می‌نویسد
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleViewMode(mode: 'operational' | 'full') {
    setViewMode(mode);
    try { localStorage.setItem('ba-view-mode', mode); } catch {}
  }

  // ── همگام‌سازی scope (شعبه + بازه) با URL ──
  useEffect(() => {
    if (!hydrated) return;
    const sp = new URLSearchParams();
    if (branchFilter) sp.set('branch', branchFilter);
    if (period !== '7d') sp.set('period', period);
    if (period === 'custom') {
      if (customFrom) sp.set('from', customFrom);
      if (customTo) sp.set('to', customTo);
    }
    const qs = sp.toString();
    router.replace(`/dashboard${qs ? '?' + qs : ''}`, { scroll: false });
  }, [hydrated, branchFilter, period, customFrom, customTo, router]);

  const isAdmin = user?.role === 'SuperAdmin';
  const isOperational = user?.role === 'Warehouse' || user?.role === 'Chef';
  const canSeeFinance = canAccessSection(user, 'transactions');

  const effectiveBranchId = isAdmin ? branchFilter : (user?.assignedBranch ?? null);
  const resolved = useMemo(
    () => resolvePeriod(period, customFrom, customTo),
    [period, customFrom, customTo]
  );

  // ── fetch مشترک /api/reports — منبع تراز مالی + مقایسه‌ی شعب + تفکیک هزینه ──
  const loadReports = useCallback((signal: AbortSignal) => {
    if (!resolved || !canSeeFinance) return Promise.resolve();
    setReportsLoading(true);
    const params = new URLSearchParams({ from: resolved.fromJalali, to: resolved.toJalali });
    if (effectiveBranchId) params.set('branchId', effectiveBranchId);
    if (viewMode === 'operational') params.set('excludeSetup', '1');
    return fetch(`/api/reports?${params}`, { credentials: 'include', cache: 'no-store', signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: ReportsResponse | null) => { if (!signal.aborted) setReportsData(d); })
      .catch(() => {})
      .finally(() => { if (!signal.aborted) setReportsLoading(false); });
  }, [resolved, effectiveBranchId, viewMode, canSeeFinance]);

  // ── fetch مکمل COGS/ضایعات به‌تفکیک شعبه (فقط SuperAdmin + بدون فیلتر شعبه) ──
  const loadBranchCogsWaste = useCallback((signal: AbortSignal) => {
    if (!resolved || !isAdmin || branchFilter) { setBranchCogsWaste(null); return Promise.resolve(); }
    const params = new URLSearchParams({ from: resolved.fromJalali, to: resolved.toJalali });
    return fetch(`/api/dashboard/branch-comparison?${params}`, { credentials: 'include', cache: 'no-store', signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: BranchCogsWasteResponse | null) => { if (!signal.aborted) setBranchCogsWaste(d?.branches ?? null); })
      .catch(() => {});
  }, [resolved, isAdmin, branchFilter]);

  // ── fetch مشترک /api/dashboard/overview — منبع AttentionWidget + HRSummaryCard +
  // OperationalQueues. قبلاً هر سه این‌ها مستقل همین endpoint را fetch می‌کردند
  // (سه درخواست تکراری برای یک داده روی یک صفحه) — حالا یک‌بار اینجا.
  const loadOverview = useCallback((signal: AbortSignal) => {
    if (isOperational) { setOverviewLoading(false); return Promise.resolve(); }
    setOverviewLoading(true);
    const params = new URLSearchParams();
    if (effectiveBranchId) params.set('branchId', effectiveBranchId);
    const qs = params.toString();
    return fetch(`/api/dashboard/overview${qs ? '?' + qs : ''}`, { credentials: 'include', cache: 'no-store', signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: DashboardOverviewData | null) => { if (!signal.aborted) setOverview(d); })
      .catch(() => {})
      .finally(() => { if (!signal.aborted) setOverviewLoading(false); });
  }, [isOperational, effectiveBranchId]);

  useEffect(() => {
    if (!hydrated) return;
    const ctrl = new AbortController();
    Promise.all([loadReports(ctrl.signal), loadBranchCogsWaste(ctrl.signal), loadOverview(ctrl.signal)])
      .then(() => { if (!ctrl.signal.aborted) setLastUpdated(new Date()); });
    return () => ctrl.abort();
  }, [hydrated, loadReports, loadBranchCogsWaste, loadOverview, refreshTick]);

  if (!hydrated || !user) return <DashboardSkeleton />;

  // RecentList: RBAC-scoped (useVisibleTransactions) + فیلتر شعبه‌ی هدر روی آن — دقیقاً
  // همان scope که قبلاً useDashboardMetrics تولید می‌کرد، نه آرایه‌ی خام‌ِ همه‌ی شعب.
  const recentTransactions = branchFilter && isAdmin
    ? visibleTransactions.filter((t) => t.branchId === branchFilter)
    : visibleTransactions;

  const breakdownForCard = (reportsData?.byCategory ?? [])
    .filter((c) => c.type === 'expense')
    .map((c) => ({ category: c.name, amount: c.total, percent: 0 }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
  const breakdownTotal = breakdownForCard.reduce((s, c) => s + c.amount, 0);
  const breakdownWithPercent = breakdownForCard.map((c) => ({ ...c, percent: breakdownTotal > 0 ? (c.amount / breakdownTotal) * 100 : 0 }));

  const branchSummaryData: BranchSummaryRow[] = (reportsData?.byBranch ?? []).map((b) => {
    const cw = branchCogsWaste?.find((x) => x.branchId === b.id);
    return {
      branchId: b.id,
      branchName: b.name,
      income: b.income,
      expense: b.expense,
      netFlow: b.balance,
      cogsEstimate: cw?.cogsEstimate,
      waste: cw?.waste,
    };
  });
  const showBranchSummary = isAdmin && !branchFilter && branchSummaryData.length >= 2;

  // شرکا — از partners API (نه contacts). آورده‌ی هر شریک = مجموع حساب‌های partner_equity با partnerId مطابق
  const activePartners = partners.filter((p) => p.isActive);
  const partnerEquityAccounts = accounts.filter((a) => a.type === 'partner_equity');
  const partnerWithEquity = activePartners.map((p) => ({
    ...p,
    equity: partnerEquityAccounts.filter((a) => a.partnerId === p.id).reduce((s, a) => s + a.balance, 0),
  }));

  return (
    <PageShell type="data" className="space-y-8">

        {/* ─── هدر ─── */}
        <PageToolbar
          title="داشبورد"
          sub={
            isAdmin
              ? branchFilter
                ? `نمایش: ${formatBranchName(branches.find((b) => b.id === branchFilter) ?? { name: '—' })}`
                : 'نمایش: همه شعب'
              : `شعبه: ${formatBranchName(branches.find((b) => b.id === user.assignedBranch) ?? { name: '—' })}`
          }
          actions={isAdmin ? <BranchPicker /> : undefined}
        />
        <DashboardScopeBar
          period={period}
          onPeriodChange={setPeriod}
          customFrom={customFrom}
          customTo={customTo}
          onCustomFromChange={setCustomFrom}
          onCustomToChange={setCustomTo}
          lastUpdated={lastUpdated}
          refreshing={reportsLoading}
          onRefresh={() => setRefreshTick((t) => t + 1)}
        />

        {/* ─── نقش‌محور: Warehouse / Chef ─── */}
        {isOperational && <RoleHome role={user.role} />}

        {/* ══════ ① نیازمند توجه ══════ */}
        {!isOperational && (
          <div className="space-y-3">
            <SectionLabel>نیازمند توجه</SectionLabel>
            <AttentionWidget overview={overview} overviewLoading={overviewLoading} />
          </div>
        )}

        {/* ══════ ② وضعیت امروز (SuperAdmin) ══════ */}
        {isAdmin && (
          <div className="space-y-3">
            <SectionLabel>وضعیت امروز</SectionLabel>
            <FlashReportCard branchId={branchFilter ?? undefined} />
          </div>
        )}

        {/* ══════ ③ تراز مالی ══════ */}
        {!isOperational && canSeeFinance && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <SectionLabel>تراز مالی</SectionLabel>
              <div className="flex items-center gap-0.5 bg-stone-100 rounded-md p-0.5">
                {(['operational', 'full'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleViewMode(m)}
                    className={`px-3 py-1 rounded text-[11px] font-medium transition-colors ${
                      viewMode === m ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                    }`}
                  >
                    {m === 'operational' ? 'عملیاتی' : 'کامل'}
                  </button>
                ))}
              </div>
            </div>

            <FinancialPosition data={reportsData} loading={reportsLoading} excludeSetup={viewMode === 'operational'} />

            {breakdownWithPercent.length >= 2 && (
              <BreakdownCard
                title="تفکیک هزینه"
                subtitle={`${breakdownWithPercent.length} دسته — بازه‌ی انتخابی`}
                tone="expense"
                data={breakdownWithPercent}
              />
            )}

            {/* موجودی واقعی حساب‌ها — STOCK لحظه‌ای، جدا از جریان دوره‌ی بالا */}
            {accounts.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] text-muted">موجودی واقعی حساب‌ها (لحظه‌ای، مستقل از بازه‌ی انتخابی)</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {accounts.slice(0, 4).map((a) => (
                    <div key={a.id} title={`${fmt(a.balance)} تومان`}>
                      <KPICard
                        tone="balance"
                        label={a.name}
                        value={a.balance}
                        icon={Wallet}
                        highlightNegative
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════ ④ روند ══════ */}
        {!isOperational && canSeeFinance && (
          <TrendChart branchId={branchFilter ?? undefined} />
        )}

        {/* ══════ ⑤ مقایسه شعب ══════ */}
        {showBranchSummary && (
          <BranchSummary
            data={branchSummaryData}
            onBranchClick={(id) => {
              setBranchFilter(id);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {/* ══════ ⑥ صف‌های عملیاتی ══════ */}
        {!isOperational && (
          <div className="space-y-3">
            <SectionLabel>صف‌های عملیاتی</SectionLabel>
            <OperationalQueues overview={overview} overviewLoading={overviewLoading} />
          </div>
        )}

        {/* ══════ ⑦ پرسنل و شرکا ══════ */}
        {!isOperational && (
          <div className="space-y-4">
            <SectionLabel>پرسنل و شرکا</SectionLabel>

            <HRSummaryCard overview={overview} overviewLoading={overviewLoading} />

            {isAdmin && <RecruitmentWidget />}

            {isAdmin && partnersLoaded && (
              <DashCard
                title="وضعیت شرکا"
                icon={Users2}
                iconBg="bg-violet-50"
                iconColor="text-violet-600"
                onViewAll={() => router.push('/partners')}
              >
                {activePartners.length === 0 ? (
                  <div className="text-[12px] text-muted py-1">هنوز شریکی ثبت نشده</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {partnerWithEquity.map((p) => {
                      const configured = partnerEquityAccounts.some((a) => a.partnerId === p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => router.push(`/partners/${p.id}`)}
                          className="bg-stone-50 hover:bg-stone-100 rounded-lg px-4 py-3 text-right transition-colors"
                        >
                          <div className="text-[11px] text-stone-500 truncate mb-1.5">{p.fullName}</div>
                          {configured ? (
                            <>
                              <div
                                className={cn(
                                  'text-[15px] font-semibold tabular-nums leading-none',
                                  p.equity >= 0 ? 'text-emerald-700' : 'text-rose-700',
                                )}
                                title={`${fmt(p.equity)} تومان`}
                              >
                                {formatMoneyShort(p.equity)}
                              </div>
                              <div className={cn('text-[10px] mt-1', p.equity >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                                {p.equity < 0 ? 'آورده‌ی خرج‌شده' : 'موجودی آورده'}
                              </div>
                            </>
                          ) : (
                            // آورده تنظیم نشده — به‌جای مقدار گمراه‌کننده (مثلاً «۰ تومان»)، اقدام تکمیل داده
                            <div className="text-[11px] text-accent mt-1">تنظیم آورده ←</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </DashCard>
            )}
          </div>
        )}

        {/* ══════ آخرین تراکنش‌ها ══════ */}
        {!isOperational && canSeeFinance && (
          recentTransactions.length > 0 ? (
            <div className="space-y-3">
              <SectionLabel>آخرین تراکنش‌ها</SectionLabel>
              <RecentList transactions={recentTransactions} limit={6} />
            </div>
          ) : (
            <div className="text-center text-[12px] text-muted py-8">
              هنوز هیچ تراکنشی برای نمایش وجود ندارد.
            </div>
          )
        )}

    </PageShell>
  );
}
