'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search, Receipt, SearchX, ArrowUpRight, ArrowDownLeft, Printer, ArrowLeftRight,
  Plus, MoreVertical, SlidersHorizontal, X, ChevronRight, ChevronLeft,
  type LucideIcon,
} from 'lucide-react';

import {
  Button, Card, CardBody, Chip, Empty, Input, Select, Sheet, InlineNotice,
  DataList, MetricCard, StatusPill, Popover, Skeleton,
} from '@/components/ui';
import type { DataColumn } from '@/components/ui/DataList';
import { PageShell } from '@/components/ui/PageShell';
import { PageToolbar } from '@/components/ui/PageToolbar';
import { MetricGrid } from '@/components/ui/MetricGrid';
import { useAppStore, useVisibleTransactions } from '@/store';
import { fmt, cn } from '@/lib/utils';
import { formatMoneyShort, formatSignedMoney, formatBranchName, formatCategoryDisplay } from '@/lib/design/format';
import {
  DEFAULT_FILTERS, filterTransactions, sortTransactions, summarizeTransactions,
  paginateItems, paramsToFilters, filtersToParams, countActiveFilters,
  type TransactionFilterState, type TypeFilterKey, type StatusFilter, type TransactionSortKey,
} from '@/lib/transactions/filterTransactions';
import { TxDetailPanel } from '@/components/transactions/TxDetailPanel';
import { ImportPanel } from '@/components/transactions/ImportPanel';
import { ContactLedgerDrawer } from '@/components/contacts/ContactLedgerDrawer';
import type { Transaction } from '@/types';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

const TYPE_META: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  income:   { icon: ArrowUpRight,   color: 'text-ok',    label: 'درآمد' },
  expense:  { icon: ArrowDownLeft,  color: 'text-danger', label: 'هزینه' },
  transfer: { icon: ArrowLeftRight, color: 'text-muted',  label: 'انتقال' },
};

const SORT_LABEL: Record<TransactionSortKey, string> = {
  'date-desc': 'جدیدترین',
  'date-asc': 'قدیمی‌ترین',
  'amount-desc': 'بیشترین مبلغ',
  'amount-asc': 'کمترین مبلغ',
};

/** debounce یک مقدار — برای جلوگیری از محاسبه‌ی مجدد فیلتر روی هر ضربه‌ی کیبورد. */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export default function TransactionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hydrated, setHydrated] = useState(false);

  const user = useAppStore(s => s.user);
  const branches = useAppStore(s => s.branches);
  const visible = useVisibleTransactions();
  const openTxId = useAppStore(s => s.openTxId);
  const openTx = useAppStore(s => s.openTx);
  const txError = useAppStore(s => s.txError);

  const [filters, setFilters] = useState<TransactionFilterState>(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const [filtersSheetOpen, setFiltersSheetOpen] = useState(false);
  const [openContactId, setOpenContactId] = useState<string | null>(null);

  // ── hydration: فقط یک بار، از URL فعلی state اولیه را می‌سازد ──
  useEffect(() => {
    const initial = paramsToFilters(searchParams);
    setFilters(initial);
    setSearchInput(initial.search);
    setHydrated(true);
    // فقط یک بار روی mount اجرا می‌شود
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── جستجوی debounce‌شده را داخل filters ادغام می‌کند ──
  useEffect(() => {
    if (!hydrated) return;
    setFilters(prev => (prev.search === debouncedSearch ? prev : { ...prev, search: debouncedSearch, page: 1 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, hydrated]);

  // ── دو-طرفه: هر تغییر filters در URL منعکس می‌شود (بدون اسکرول/رفرش) ──
  useEffect(() => {
    if (!hydrated) return;
    const params = filtersToParams(filters);
    const qs = new URLSearchParams(params).toString();
    router.replace(qs ? `/transactions?${qs}` : '/transactions', { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, hydrated]);

  function updateFilters(patch: Partial<TransactionFilterState>) {
    setFilters(prev => ({ ...prev, ...patch, page: patch.page !== undefined ? patch.page : 1 }));
  }

  function clearAllFilters() {
    setFilters(DEFAULT_FILTERS);
    setSearchInput('');
  }

  const isAdmin = user?.role === 'SuperAdmin';

  const filteredUnsorted = useMemo(() => filterTransactions(visible, filters), [visible, filters]);
  const summary = useMemo(() => summarizeTransactions(filteredUnsorted), [filteredUnsorted]);
  const sorted = useMemo(() => sortTransactions(filteredUnsorted, filters.sort), [filteredUnsorted, filters.sort]);
  const paginated = useMemo(() => paginateItems(sorted, filters.page, PAGE_SIZE), [sorted, filters.page]);

  const activeFilterCount = countActiveFilters(filters);
  const advancedCount = (filters.dateFrom ? 1 : 0) + (filters.dateTo ? 1 : 0);

  const ownBranch = !isAdmin && user ? branches.find(b => b.id === user.assignedBranch) : undefined;
  const branchScopeLabel = isAdmin
    ? (filters.branchId === 'all' ? 'همه شعب' : formatBranchName(branches.find(b => b.id === filters.branchId) ?? { name: '—' }))
    : (ownBranch ? formatBranchName(ownBranch) : '—');
  const periodScopeLabel = filters.dateFrom && filters.dateTo
    ? `${filters.dateFrom} تا ${filters.dateTo}`
    : filters.dateFrom
    ? `از ${filters.dateFrom}`
    : filters.dateTo
    ? `تا ${filters.dateTo}`
    : 'همه‌ی بازه‌ها';

  if (!hydrated || !user) {
    return (
      <div className="p-4 lg:p-6 space-y-4">
        <Skeleton.PageHeader />
        <MetricGrid minCardWidth={180}>
          <Skeleton.Metric /><Skeleton.Metric /><Skeleton.Metric /><Skeleton.Metric />
        </MetricGrid>
        <Skeleton.Toolbar />
        <Skeleton.Table rows={8} />
      </div>
    );
  }

  // ─── DataList columns ──────────────────────────────────────────────
  const columns: DataColumn<Transaction>[] = [
    {
      key: 'title',
      label: 'عنوان',
      render: (tx) => {
        const typeM = TYPE_META[tx.type] ?? TYPE_META['expense']!;
        const Icon = typeM.icon;
        return (
          <div className={cn('flex items-center gap-2 min-w-0', tx.status === 'rejected' && 'opacity-50')}>
            <Icon size={13} strokeWidth={1.5} className={cn('flex-shrink-0', typeM.color)} aria-hidden />
            <div className="min-w-0">
              <div className="text-[12.5px] text-text truncate max-w-[180px]">{tx.title}</div>
              <div className="text-[10.5px] text-muted truncate">
                {tx.payee}
                {tx.invoiceCode && (
                  <span className="mr-1.5 text-muted/70">
                    · <span dir="ltr">{tx.invoiceCode}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'category',
      label: 'دسته',
      mobileHide: true,
      render: (tx) => <span className="text-[11.5px] text-muted">{formatCategoryDisplay(tx.categoryName) || '—'}</span>,
    },
    {
      key: 'amount',
      label: 'مبلغ (تومان)',
      headerClassName: 'text-left',
      cellClassName: 'text-left',
      render: (tx) => {
        const typeM = TYPE_META[tx.type] ?? TYPE_META['expense']!;
        const signedAmount = tx.type === 'expense' ? -tx.amount : tx.amount;
        return (
          <span
            className={cn('text-[12.5px] font-medium num', typeM.color, tx.status === 'rejected' && 'opacity-50')}
            title={fmt(tx.amount)}
          >
            {tx.type === 'transfer'
              ? <span dir="ltr">⇄ {formatMoneyShort(tx.amount)}</span>
              : formatSignedMoney(signedAmount, { showPlus: true, short: true })}
          </span>
        );
      },
    },
    {
      key: 'date',
      label: 'تاریخ',
      render: (tx) => <span className="text-[11.5px] text-muted num" dir="ltr">{tx.date}</span>,
    },
    {
      key: 'branch',
      label: 'شعبه',
      render: (tx) => (
        <span className="text-[11.5px] text-muted">
          {formatBranchName({ name: tx.branch })}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'وضعیت',
      render: (tx) => <StatusPill status={tx.status} />,
    },
  ];

  const trueEmpty = visible.length === 0;
  const noResults = !trueEmpty && filteredUnsorted.length === 0;

  return (
    <>
    <PageShell type="data" className="p-4 lg:p-6 print:p-2 space-y-4">

        {/* Header */}
        <PageToolbar
          className="print:hidden"
          title="تراکنش‌ها"
          sub={`${fmt(filteredUnsorted.length)} تراکنش از ${fmt(visible.length)}`}
          actions={
            <>
              <Button variant="primary" size="sm" icon={Plus} onClick={() => router.push('/transactions/new')}>
                ثبت تراکنش
              </Button>
              <Popover
                trigger={<MoreVertical size={14} strokeWidth={1.5} />}
                triggerLabel="اقدامات بیشتر"
                align="end"
              >
                {(close) => (
                  <div className="p-2 w-72">
                    <button
                      type="button"
                      onClick={() => { close(); window.print(); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-[12.5px] text-text hover:bg-bg text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40"
                    >
                      <Printer size={14} strokeWidth={1.5} /> چاپ لیست
                    </button>
                    <div className="border-t border-border my-1.5" />
                    <div className="px-1 pb-1">
                      <ImportPanel onDone={() => window.location.reload()} />
                    </div>
                  </div>
                )}
              </Popover>
            </>
          }
        />

        {/* دامنه‌ی فعلی: دوره + شعبه — تا خلاصه‌ها/جدول بدون ابهام تفسیر شوند */}
        <p className="text-[11px] text-muted print:hidden">
          دوره: {periodScopeLabel} · شعبه: {branchScopeLabel}
        </p>

        {/* Print header */}
        <div className="hidden print:block mb-4">
          <h1 className="text-xl font-bold text-black">لیست تراکنش‌ها — با شرف</h1>
          <p className="text-sm text-gray-600 mt-1">
            تاریخ چاپ: {new Date().toLocaleDateString('fa-IR')} — تعداد: {filteredUnsorted.length}
          </p>
        </div>

        {/* خطای عملیات (تایید/رد/ویرایش/حذف) — هرگز پشت empty state پنهان نمی‌شود */}
        {txError && (
          <InlineNotice tone="danger" onDismiss={() => useAppStore.setState({ txError: null })} className="print:hidden">
            {txError}
          </InlineNotice>
        )}

        {/* Summary metrics — روی نتیجه‌ی فیلترشده (نه لزوماً مرتب‌شده) */}
        <MetricGrid minCardWidth={180} className="print:hidden">
          <div title={`${fmt(summary.approvedIncome)} تومان`}>
            <MetricCard label="درآمد (تأییدشده)" value={summary.approvedIncome} sparkColor="#15803d" />
          </div>
          <div title={`${fmt(summary.approvedExpense)} تومان`}>
            <MetricCard label="هزینه (تأییدشده)" value={summary.approvedExpense} sparkColor="#be123c" />
          </div>
          <div title={`${fmt(summary.periodNetFlow)} تومان`}>
            <MetricCard label="روند خالص دوره" value={summary.periodNetFlow} sparkColor={summary.periodNetFlow >= 0 ? '#15803d' : '#be123c'} />
          </div>
          {summary.pendingCount > 0 ? (
            <button
              type="button"
              onClick={() => updateFilters({ status: 'pending' })}
              className="text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded-lg"
              title="فیلتر بر اساس در انتظار تأیید"
            >
              <MetricCard label="در انتظار تأیید" value={summary.pendingCount} unit="count" sparkColor="#b45309" />
            </button>
          ) : (
            <MetricCard label="در انتظار تأیید" value={0} unit="count" sparkColor="#b45309" />
          )}
        </MetricGrid>

        {/* Summary bar print-only (بدون کامپوننت) */}
        <div className="hidden print:grid grid-cols-3 gap-2 print:gap-2">
          {[
            { label: 'درآمد', value: summary.approvedIncome },
            { label: 'هزینه', value: summary.approvedExpense },
            { label: 'روند خالص دوره', value: summary.periodNetFlow },
          ].map(({ label, value }) => (
            <div key={label} className="border border-gray-300 rounded px-3 py-2">
              <div className="text-[10px] text-gray-500">{label}</div>
              <div className="text-[14px] font-medium tabular-nums text-black">{fmt(value)} تومان</div>
            </div>
          ))}
        </div>

        {/* Filters — دسکتاپ: FilterToolbar فشرده + popover پیشرفته | موبایل: دکمه‌ی باز کردن Sheet */}
        <div className="print:hidden space-y-2">
          <div className="hidden md:flex flex-wrap items-center gap-2">
            <Input
              icon={Search}
              placeholder="جستجو در عنوان، طرف معامله، مبلغ..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="w-64"
            />
            <Select value={filters.type} onChange={e => updateFilters({ type: e.target.value as TypeFilterKey })} className="min-w-[100px]">
              <option value="all">همه انواع</option>
              <option value="income">درآمد</option>
              <option value="expense">هزینه</option>
              <option value="transfer">انتقال</option>
            </Select>
            <Select value={filters.status} onChange={e => updateFilters({ status: e.target.value as StatusFilter })} className="min-w-[110px]">
              <option value="all">همه وضعیت‌ها</option>
              <option value="approved">تایید شده</option>
              <option value="pending">در انتظار</option>
              <option value="rejected">رد شده</option>
              <option value="proforma">پیش‌فاکتور</option>
            </Select>
            {isAdmin && (
              <Select value={filters.branchId} onChange={e => updateFilters({ branchId: e.target.value })} className="min-w-[110px]">
                <option value="all">همه شعب</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{formatBranchName(b)}</option>
                ))}
              </Select>
            )}

            <Popover
              trigger={<><SlidersHorizontal size={13} strokeWidth={1.5} /> فیلتر پیشرفته</>}
              badge={advancedCount}
              align="end"
            >
              <div className="p-3 w-72 space-y-3">
                <div>
                  <label className="block text-[10.5px] text-muted mb-1">از تاریخ (شمسی)</label>
                  <input
                    type="text"
                    placeholder="مثلاً ۱۴۰۵/۰۱/۰۱"
                    value={filters.dateFrom}
                    onChange={e => updateFilters({ dateFrom: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-border text-[12px] bg-surface text-text focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/40"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] text-muted mb-1">تا تاریخ (شمسی)</label>
                  <input
                    type="text"
                    placeholder="مثلاً ۱۴۰۵/۱۲/۲۹"
                    value={filters.dateTo}
                    onChange={e => updateFilters({ dateTo: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-border text-[12px] bg-surface text-text focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/40"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] text-muted mb-1">مرتب‌سازی</label>
                  <Select value={filters.sort} onChange={e => updateFilters({ sort: e.target.value as TransactionSortKey })} className="w-full">
                    {(Object.keys(SORT_LABEL) as TransactionSortKey[]).map(k => (
                      <option key={k} value={k}>{SORT_LABEL[k]}</option>
                    ))}
                  </Select>
                </div>
              </div>
            </Popover>

            {activeFilterCount > 0 && (
              <Button variant="ghost" size="field" icon={X} onClick={clearAllFilters}>
                پاک کردن فیلترها ({activeFilterCount})
              </Button>
            )}
          </div>

          {/* دکمه‌ی فیلتر موبایل */}
          <div className="md:hidden">
            <Button variant="default" size="sm" icon={SlidersHorizontal} onClick={() => setFiltersSheetOpen(true)}>
              فیلترها{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Button>
          </div>

          {/* چیپ‌های فیلتر فعال — قابل حذف تک‌تک */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {filters.type !== 'all' && (
                <Chip tone="neutral">
                  نوع: {TYPE_META[filters.type]?.label ?? filters.type}
                  <button onClick={() => updateFilters({ type: 'all' })} aria-label="حذف فیلتر نوع" className="mr-1 align-middle"><X size={11} /></button>
                </Chip>
              )}
              {filters.status !== 'all' && (
                <Chip tone="neutral">
                  وضعیت: {filters.status === 'approved' ? 'تایید شده' : filters.status === 'pending' ? 'در انتظار' : filters.status === 'proforma' ? 'پیش‌فاکتور' : 'رد شده'}
                  <button onClick={() => updateFilters({ status: 'all' })} aria-label="حذف فیلتر وضعیت" className="mr-1 align-middle"><X size={11} /></button>
                </Chip>
              )}
              {isAdmin && filters.branchId !== 'all' && (
                <Chip tone="neutral">
                  شعبه: {formatBranchName(branches.find(b => b.id === filters.branchId) ?? { name: '—' })}
                  <button onClick={() => updateFilters({ branchId: 'all' })} aria-label="حذف فیلتر شعبه" className="mr-1 align-middle"><X size={11} /></button>
                </Chip>
              )}
              {filters.dateFrom && (
                <Chip tone="neutral">
                  از: <span dir="ltr">{filters.dateFrom}</span>
                  <button onClick={() => updateFilters({ dateFrom: '' })} aria-label="حذف فیلتر از تاریخ" className="mr-1 align-middle"><X size={11} /></button>
                </Chip>
              )}
              {filters.dateTo && (
                <Chip tone="neutral">
                  تا: <span dir="ltr">{filters.dateTo}</span>
                  <button onClick={() => updateFilters({ dateTo: '' })} aria-label="حذف فیلتر تا تاریخ" className="mr-1 align-middle"><X size={11} /></button>
                </Chip>
              )}
            </div>
          )}
        </div>

        {/* Sheet فیلترهای موبایل — همه‌ی فیلترها یک‌جا */}
        <Sheet open={filtersSheetOpen} onClose={() => setFiltersSheetOpen(false)} title="فیلترها">
          <div className="p-4 space-y-3">
            <Input
              icon={Search}
              placeholder="جستجو در عنوان، طرف معامله، مبلغ..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="w-full"
            />
            <Select value={filters.type} onChange={e => updateFilters({ type: e.target.value as TypeFilterKey })} className="w-full">
              <option value="all">همه انواع</option>
              <option value="income">درآمد</option>
              <option value="expense">هزینه</option>
              <option value="transfer">انتقال</option>
            </Select>
            <Select value={filters.status} onChange={e => updateFilters({ status: e.target.value as StatusFilter })} className="w-full">
              <option value="all">همه وضعیت‌ها</option>
              <option value="approved">تایید شده</option>
              <option value="pending">در انتظار</option>
              <option value="rejected">رد شده</option>
              <option value="proforma">پیش‌فاکتور</option>
            </Select>
            {isAdmin && (
              <Select value={filters.branchId} onChange={e => updateFilters({ branchId: e.target.value })} className="w-full">
                <option value="all">همه شعب</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{formatBranchName(b)}</option>
                ))}
              </Select>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10.5px] text-muted mb-1">از تاریخ</label>
                <input
                  type="text"
                  placeholder="۱۴۰۵/۰۱/۰۱"
                  value={filters.dateFrom}
                  onChange={e => updateFilters({ dateFrom: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-border text-[12px] focus:outline-none focus:border-accent bg-surface text-text"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-[10.5px] text-muted mb-1">تا تاریخ</label>
                <input
                  type="text"
                  placeholder="۱۴۰۵/۱۲/۲۹"
                  value={filters.dateTo}
                  onChange={e => updateFilters({ dateTo: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-border text-[12px] focus:outline-none focus:border-accent bg-surface text-text"
                  dir="ltr"
                />
              </div>
            </div>
            <Select value={filters.sort} onChange={e => updateFilters({ sort: e.target.value as TransactionSortKey })} className="w-full">
              {(Object.keys(SORT_LABEL) as TransactionSortKey[]).map(k => (
                <option key={k} value={k}>{SORT_LABEL[k]}</option>
              ))}
            </Select>
            <div className="flex gap-2 pt-2">
              <Button variant="default" className="flex-1" onClick={clearAllFilters} disabled={activeFilterCount === 0}>
                پاک کردن فیلترها
              </Button>
              <Button variant="primary" className="flex-1" onClick={() => setFiltersSheetOpen(false)}>
                اعمال
              </Button>
            </div>
          </div>
        </Sheet>

        {/* Transaction list */}
        <div className="print:hidden">
          {trueEmpty ? (
            <Card><CardBody>
              <Empty
                icon={Receipt}
                title="هنوز تراکنشی ثبت نشده است"
                sub="اولین تراکنش را ثبت کنید تا اینجا نمایش داده شود."
                action={<Button variant="primary" size="sm" icon={Plus} onClick={() => router.push('/transactions/new')}>ثبت تراکنش</Button>}
              />
            </CardBody></Card>
          ) : noResults ? (
            <Card><CardBody>
              <Empty
                icon={SearchX}
                title="نتیجه‌ای برای این فیلترها نیست"
                sub="فیلترها را تغییر دهید یا پاک کنید."
                action={<Button variant="default" size="sm" icon={X} onClick={clearAllFilters}>پاک کردن فیلترها</Button>}
              />
            </CardBody></Card>
          ) : (
            <>
              <DataList<Transaction>
                columns={columns}
                data={paginated.items}
                keyExtractor={tx => tx.id}
                onRowClick={tx => openTx(tx.id)}
                rowClassName={tx => tx.status === 'proforma' ? 'bg-amber-50/60 border-amber-200' : undefined}
                stickyHeader
                maxHeight="60vh"
              />
              {paginated.totalPages > 1 && (
                <div className="flex items-center justify-between mt-3 text-[12px] text-muted">
                  <span>صفحه {fmt(paginated.page)} از {fmt(paginated.totalPages)} · {fmt(paginated.totalItems)} مورد</span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="default" size="sm" icon={ChevronRight}
                      disabled={paginated.page <= 1}
                      onClick={() => updateFilters({ page: paginated.page - 1 })}
                      aria-label="صفحه‌ی قبل"
                    />
                    <Button
                      variant="default" size="sm" icon={ChevronLeft}
                      disabled={paginated.page >= paginated.totalPages}
                      onClick={() => updateFilters({ page: paginated.page + 1 })}
                      aria-label="صفحه‌ی بعد"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Print table (DataList در چاپ کار نمی‌کند) */}
        <div className="hidden print:block">
          <table className="w-full text-[11pt] border-collapse">
            <thead>
              <tr className="border-b border-gray-400 bg-gray-100">
                <th className="text-right px-3 py-2">عنوان</th>
                <th className="text-right px-3 py-2">دسته</th>
                <th className="text-left px-3 py-2">مبلغ</th>
                <th className="text-right px-3 py-2">تاریخ</th>
                <th className="text-right px-3 py-2">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(tx => (
                <tr key={tx.id} className="border-b border-gray-200">
                  <td className="px-3 py-1.5">
                    {tx.title}
                    {tx.invoiceCode && <span className="text-gray-400 text-[9pt] mr-1.5">({tx.invoiceCode})</span>}
                  </td>
                  <td className="px-3 py-1.5 text-gray-500">{formatCategoryDisplay(tx.categoryName) || '—'}</td>
                  <td className="px-3 py-1.5 text-left tabular-nums">
                    {tx.type === 'transfer'
                      ? <span dir="ltr">⇄ {fmt(tx.amount)} تومان</span>
                      : formatSignedMoney(tx.type === 'expense' ? -tx.amount : tx.amount, { showPlus: true })}
                  </td>
                  <td className="px-3 py-1.5 text-gray-500">{tx.date}</td>
                  <td className="px-3 py-1.5">
                    {tx.status === 'approved' ? 'تأیید شده' : tx.status === 'pending' ? 'در انتظار' : tx.status === 'proforma' ? 'پیش‌فاکتور' : 'رد شده'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

    </PageShell>

      {openTxId && (() => {
        const tx = visible.find(t => t.id === openTxId);
        return tx ? (
          <TxDetailPanel
            tx={tx}
            onClose={() => openTx(null)}
            onContactClick={id => setOpenContactId(id)}
          />
        ) : null;
      })()}
      <ContactLedgerDrawer
        contactId={openContactId}
        onClose={() => setOpenContactId(null)}
      />
    </>
  );
}
