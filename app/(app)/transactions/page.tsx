'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search, Receipt, Clock, CheckCircle2, XCircle,
  ArrowUpRight, ArrowDownLeft, Printer, ArrowLeftRight, Plus,
  type LucideIcon,
} from 'lucide-react';

import {
  Button, Card, CardBody, Chip, Empty, Input, Select,
  DataList, MetricCard, StatusPill,
} from '@/components/ui';
import type { DataColumn } from '@/components/ui/DataList';
import { useAppStore, useVisibleTransactions } from '@/store';
import { fmt, cn } from '@/lib/utils';
import { formatMoneyShort, formatSignedMoney, formatBranchName } from '@/lib/design/format';
import { TxDetailPanel } from '@/components/transactions/TxDetailPanel';
import { ImportPanel } from '@/components/transactions/ImportPanel';
import { ContactLedgerDrawer } from '@/components/contacts/ContactLedgerDrawer';
import type { Transaction, TransactionStatus, TransactionType } from '@/types';

type StatusFilter = 'all' | TransactionStatus;
type TypeFilter = 'all' | TransactionType;
type SortKey = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

const TYPE_META: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  income:   { icon: ArrowUpRight,   color: 'text-ok',    label: 'درآمد' },
  expense:  { icon: ArrowDownLeft,  color: 'text-danger', label: 'هزینه' },
  transfer: { icon: ArrowLeftRight, color: 'text-muted',  label: 'انتقال' },
};

/** تبدیل تاریخ شمسی (YYYY/MM/DD با ارقام فارسی) به Gregorian ISO */
function jalaliToISO(jalali: string): string | null {
  if (!jalali.trim()) return null;
  try {
    const latin = jalali.replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
    const parts = latin.split('/');
    if (parts.length !== 3) return null;
    const [jy, jm, jd] = parts.map(Number);
    if (!jy || !jm || !jd) return null;
    const jy1 = jy - 979;
    const jm1 = jm - 1;
    const j_day_no = 365 * jy1 + Math.floor(jy1 / 33) * 8 + Math.floor((jy1 % 33 + 3) / 4);
    let jdm = 0;
    for (let i = 0; i < jm1; i++) jdm += i < 6 ? 31 : 30;
    const jdn = j_day_no + jdm + (jd - 1) + 2459336 - 1948440 + 1;
    let l = jdn + 68569, n = Math.floor(4 * l / 146097);
    l = l - Math.floor((146097 * n + 3) / 4);
    let i = Math.floor(4000 * (l + 1) / 1461001);
    l = l - Math.floor(1461 * i / 4) + 31;
    let j2 = Math.floor(80 * l / 2447);
    const gd = l - Math.floor(2447 * j2 / 80);
    l = Math.floor(j2 / 11);
    const gm = j2 + 2 - 12 * l;
    const gy = 100 * (n - 49) + i + l;
    return `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`;
  } catch {
    return null;
  }
}

export default function TransactionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hydrated, setHydrated] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const user = useAppStore(s => s.user);
  const branches = useAppStore(s => s.branches);
  const visible = useVisibleTransactions();
  const openTxId = useAppStore(s => s.openTxId);
  const openTx = useAppStore(s => s.openTx);

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('date-desc');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [openContactId, setOpenContactId] = useState<string | null>(null);

  useEffect(() => {
    setHydrated(true);
    const q = searchParams.get('q');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const type = searchParams.get('type') as TypeFilter | null;
    if (q) setSearch(q);
    if (from) setDateFrom(from);
    if (to) setDateTo(to);
    if (type && ['income', 'expense', 'transfer'].includes(type)) setTypeFilter(type);
  // فقط یک بار روی mount اجرا می‌شود
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    let result = [...visible];
    if (typeFilter !== 'all') result = result.filter(t => t.type === typeFilter);
    if (statusFilter !== 'all') result = result.filter(t => t.status === statusFilter);
    if (branchFilter !== 'all') result = result.filter(t => t.branchId === branchFilter);

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.payee.toLowerCase().includes(q) ||
        t.categoryName.toLowerCase().includes(q) ||
        String(t.amount).includes(q)
      );
    }

    if (dateFrom.trim()) {
      const isoFrom = jalaliToISO(dateFrom);
      if (isoFrom) {
        const from = new Date(isoFrom);
        result = result.filter(t => {
          const txDate = jalaliToISO(t.date.replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))));
          return txDate ? new Date(txDate) >= from : true;
        });
      }
    }
    if (dateTo.trim()) {
      const isoTo = jalaliToISO(dateTo);
      if (isoTo) {
        const to = new Date(isoTo + 'T23:59:59');
        result = result.filter(t => {
          const txDate = jalaliToISO(t.date.replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))));
          return txDate ? new Date(txDate) <= to : true;
        });
      }
    }

    switch (sort) {
      case 'date-desc':   result.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); break;
      case 'date-asc':    result.sort((a, b) => a.createdAt.localeCompare(b.createdAt)); break;
      case 'amount-desc': result.sort((a, b) => b.amount - a.amount); break;
      case 'amount-asc':  result.sort((a, b) => a.amount - b.amount); break;
    }
    return result;
  }, [visible, typeFilter, statusFilter, branchFilter, search, sort, dateFrom, dateTo]);

  const approvedInFiltered = filtered.filter(t => t.status === 'approved');
  const totalIncome  = approvedInFiltered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = approvedInFiltered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  if (!hydrated || !user) {
    return <div className="p-6"><div className="h-96 bg-stone-100 rounded-lg animate-pulse" /></div>;
  }

  const isAdmin = user.role === 'SuperAdmin';

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
                {tx.invoiceCode && <span className="mr-1.5 text-muted/70">· {tx.invoiceCode}</span>}
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
      render: (tx) => <span className="text-[11.5px] text-muted">{tx.categoryName || '—'}</span>,
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
      mobileHide: true,
      render: (tx) => <span className="text-[11.5px] text-muted num">{tx.date}</span>,
    },
    {
      key: 'branch',
      label: 'شعبه',
      mobileHide: true,
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

  return (
    <div className="p-4 lg:p-6 print:p-2" ref={printRef}>
      <div className="max-w-6xl mx-auto space-y-4">

        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
          <div>
            <h1 className="text-[20px] font-medium text-stone-900 tracking-tight">تراکنش‌ها</h1>
            <div className="text-[12px] text-muted mt-1">{filtered.length} تراکنش</div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="primary" size="sm" icon={Plus} onClick={() => router.push('/transactions/new')}>
              ثبت تراکنش
            </Button>
            <ImportPanel onDone={() => window.location.reload()} />
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 h-9 px-3 rounded-md border border-border text-[12px] text-muted hover:text-text transition-colors"
            >
              <Printer size={13} strokeWidth={1.5} />
              <span className="hidden sm:inline">چاپ</span>
            </button>
          </div>
        </div>

        {/* Print header */}
        <div className="hidden print:block mb-4">
          <h1 className="text-xl font-bold text-black">لیست تراکنش‌ها — با شرف</h1>
          <p className="text-sm text-gray-600 mt-1">
            تاریخ چاپ: {new Date().toLocaleDateString('fa-IR')} — تعداد: {filtered.length}
          </p>
        </div>

        {/* Summary bar — MetricCard (S4: عدد کامل در title) */}
        <div className="grid grid-cols-3 gap-3 print:hidden">
          <div title={`${fmt(totalIncome)} تومان`}>
            <MetricCard label="درآمد (تأییدشده)" value={totalIncome} sparkColor="#15803d" />
          </div>
          <div title={`${fmt(totalExpense)} تومان`}>
            <MetricCard label="هزینه (تأییدشده)" value={totalExpense} sparkColor="#be123c" />
          </div>
          <div title={`${fmt(balance)} تومان`}>
            <MetricCard label="موجودی" value={balance} sparkColor={balance >= 0 ? '#15803d' : '#be123c'} />
          </div>
        </div>

        {/* Summary bar print-only (بدون کامپوننت) */}
        <div className="hidden print:grid grid-cols-3 gap-2 print:gap-2">
          {[
            { label: 'درآمد', value: totalIncome },
            { label: 'هزینه', value: totalExpense },
            { label: 'موجودی', value: balance },
          ].map(({ label, value }) => (
            <div key={label} className="border border-gray-300 rounded px-3 py-2">
              <div className="text-[10px] text-gray-500">{label}</div>
              <div className="text-[14px] font-medium tabular-nums text-black">{fmt(value)} تومان</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="print:hidden space-y-3">
          <div className="relative">
            <Search size={14} strokeWidth={1.5} className="absolute top-1/2 -translate-y-1/2 right-3 text-muted pointer-events-none" />
            <input
              type="search"
              placeholder="جستجو در عنوان، طرف معامله، مبلغ..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-10 pr-9 pl-3 rounded-md border border-border text-[13px] text-text placeholder:text-muted focus:outline-none focus:border-accent bg-surface"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10.5px] text-muted mb-1">از تاریخ (شمسی)</label>
              <input
                type="text"
                placeholder="مثلاً ۱۴۰۵/۰۱/۰۱"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-border text-[12px] focus:outline-none focus:border-accent bg-surface text-text"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-[10.5px] text-muted mb-1">تا تاریخ (شمسی)</label>
              <input
                type="text"
                placeholder="مثلاً ۱۴۰۵/۱۲/۲۹"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-border text-[12px] focus:outline-none focus:border-accent bg-surface text-text"
                dir="ltr"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value as TypeFilter)} className="h-9 text-[12px] min-w-[100px]">
              <option value="all">همه انواع</option>
              <option value="income">درآمد</option>
              <option value="expense">هزینه</option>
              <option value="transfer">انتقال</option>
            </Select>
            <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)} className="h-9 text-[12px] min-w-[110px]">
              <option value="all">همه وضعیت‌ها</option>
              <option value="approved">تایید شده</option>
              <option value="pending">در انتظار</option>
              <option value="rejected">رد شده</option>
              <option value="proforma">پیش‌فاکتور</option>
            </Select>
            {isAdmin && (
              <Select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className="h-9 text-[12px] min-w-[110px]">
                <option value="all">همه شعب</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{formatBranchName(b)}</option>
                ))}
              </Select>
            )}
            <Select value={sort} onChange={e => setSort(e.target.value as SortKey)} className="h-9 text-[12px] min-w-[120px]">
              <option value="date-desc">جدیدترین</option>
              <option value="date-asc">قدیمی‌ترین</option>
              <option value="amount-desc">بیشترین مبلغ</option>
              <option value="amount-asc">کمترین مبلغ</option>
            </Select>
          </div>
        </div>

        {/* Transaction list — DataList */}
        <div className="print:hidden">
          <DataList<Transaction>
            columns={columns}
            data={filtered}
            keyExtractor={tx => tx.id}
            onRowClick={tx => openTx(tx.id)}
            rowClassName={tx => tx.status === 'proforma' ? 'bg-amber-50/60 border-amber-200' : undefined}
            empty={
              <Card><CardBody>
                <Empty title="تراکنشی یافت نشد" sub="فیلترها را تغییر دهید" icon={Receipt} />
              </CardBody></Card>
            }
          />
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
              {filtered.map(tx => (
                <tr key={tx.id} className="border-b border-gray-200">
                  <td className="px-3 py-1.5">
                    {tx.title}
                    {tx.invoiceCode && <span className="text-gray-400 text-[9pt] mr-1.5">({tx.invoiceCode})</span>}
                  </td>
                  <td className="px-3 py-1.5 text-gray-500">{tx.categoryName || '—'}</td>
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

      </div>

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
    </div>
  );
}
