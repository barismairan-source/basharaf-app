'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Receipt, Clock, CheckCircle2, XCircle,
  ArrowUpRight, ArrowDownLeft, Printer, ArrowLeftRight,
  type LucideIcon,
} from 'lucide-react';

import {
  Card, CardBody, Chip, Empty, Input, Select, Th, Td,
} from '@/components/ui';
import { useAppStore, useVisibleTransactions } from '@/store';
import { fmt, cn } from '@/lib/utils';
import { TxDetailPanel } from '@/components/transactions/TxDetailPanel';
import type { Transaction, TransactionStatus, TransactionType } from '@/types';

type StatusFilter = 'all' | TransactionStatus;
type TypeFilter = 'all' | TransactionType;
type SortKey = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

const STATUS_META: Record<TransactionStatus, { icon: LucideIcon; chipTone: 'amber' | 'green' | 'red'; label: string }> = {
  pending: { icon: Clock, chipTone: 'amber', label: 'در انتظار' },
  approved: { icon: CheckCircle2, chipTone: 'green', label: 'تایید شده' },
  rejected: { icon: XCircle, chipTone: 'red', label: 'رد شده' },
};

const TYPE_META: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  income: { icon: ArrowUpRight, color: 'text-emerald-700', label: 'درآمد' },
  expense: { icon: ArrowDownLeft, color: 'text-rose-700', label: 'هزینه' },
  transfer: { icon: ArrowLeftRight, color: 'text-stone-500', label: 'انتقال' },
};

/** تبدیل تاریخ شمسی (YYYY/MM/DD با ارقام فارسی) به Gregorian ISO */
function jalaliToISO(jalali: string): string | null {
  if (!jalali.trim()) return null;
  try {
    // تبدیل ارقام فارسی به لاتین
    const latin = jalali.replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
    const parts = latin.split('/');
    if (parts.length !== 3) return null;
    const [jy, jm, jd] = parts.map(Number);
    if (!jy || !jm || !jd) return null;
    // الگوریتم تبدیل جلالی به گرگوری
    const jy1 = jy - 979;
    const jm1 = jm - 1;
    let jd1 = jd - 1;
    const j_day_no = 365 * jy1 + Math.floor(jy1 / 33) * 8 + Math.floor((jy1 % 33 + 3) / 4);
    let jdm = 0;
    for (let i = 0; i < jm1; i++) jdm += i < 6 ? 31 : 30;
    const jdn = j_day_no + jdm + jd1 + 2459336 - 1948440 + 1;
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
  // فیلتر تاریخ شمسی
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => { setHydrated(true); }, []);

  const filtered = useMemo(() => {
    let result = [...visible];
    if (typeFilter !== 'all') result = result.filter(t => t.type === typeFilter);
    if (statusFilter !== 'all') result = result.filter(t => t.status === statusFilter);
    if (branchFilter !== 'all') result = result.filter(t => t.branchId === branchFilter);

    // جستجو — title، payee، category، مبلغ
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.payee.toLowerCase().includes(q) ||
        t.categoryName.toLowerCase().includes(q) ||
        String(t.amount).includes(q)
      );
    }

    // فیلتر تاریخ شمسی
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
      case 'date-desc': result.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); break;
      case 'date-asc': result.sort((a, b) => a.createdAt.localeCompare(b.createdAt)); break;
      case 'amount-desc': result.sort((a, b) => b.amount - a.amount); break;
      case 'amount-asc': result.sort((a, b) => a.amount - b.amount); break;
    }
    return result;
  }, [visible, typeFilter, statusFilter, branchFilter, search, sort, dateFrom, dateTo]);

  const approvedInFiltered = filtered.filter(t => t.status === 'approved');
  const totalIncome = approvedInFiltered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = approvedInFiltered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  if (!hydrated || !user) {
    return <div className="p-6"><div className="h-96 bg-stone-100 rounded-lg animate-pulse" /></div>;
  }

  const isAdmin = user.role === 'SuperAdmin';

  return (
    <div className="p-4 lg:p-6 print:p-2">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-end justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-[20px] font-medium text-stone-900 tracking-tight">تراکنش‌ها</h1>
            <div className="text-[12px] text-stone-500 mt-1">{filtered.length} تراکنش</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 h-9 px-3 rounded-md border border-stone-200 text-[12px] text-stone-600 hover:bg-stone-50 transition-colors"
            >
              <Printer size={13} strokeWidth={1.5} />
              <span className="hidden sm:inline">چاپ</span>
            </button>
          </div>
        </div>

        {/* Print header */}
        <div className="hidden print:block mb-4">
          <h1 className="text-xl font-bold text-black">لیست تراکنش‌ها — با شرف</h1>
          <p className="text-sm text-gray-600 mt-1">تاریخ چاپ: {new Date().toLocaleDateString('fa-IR')} — تعداد: {filtered.length}</p>
        </div>

        {/* Summary bar */}
        <div className="grid grid-cols-3 gap-3 print:gap-2">
          {[
            { label: 'درآمد', value: totalIncome, color: 'text-emerald-700' },
            { label: 'هزینه', value: totalExpense, color: 'text-rose-700' },
            { label: 'موجودی', value: totalIncome - totalExpense, color: totalIncome - totalExpense >= 0 ? 'text-stone-900' : 'text-rose-700' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-stone-200 rounded-lg px-4 py-3 print:border-gray-300">
              <div className="text-[10.5px] text-stone-500 mb-1 print:text-gray-500">{label}</div>
              <div className={cn('text-[16px] sm:text-[18px] font-medium tabular-nums print:text-black', color)}>{fmt(value)}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="print:hidden space-y-3">
          {/* Row 1: search */}
          <div className="relative">
            <Search size={14} strokeWidth={1.5} className="absolute top-1/2 -translate-y-1/2 right-3 text-stone-400 pointer-events-none" />
          <input
            type="search"
            placeholder="جستجو در عنوان، طرف معامله، مبلغ..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-10 pr-9 pl-3 rounded-md border border-stone-200 text-[13px] text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-stone-500 bg-white"
          />
          </div>

          {/* Row 2: date range شمسی */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10.5px] text-stone-500 mb-1">از تاریخ (شمسی)</label>
              <input
                type="text"
                placeholder="مثلاً ۱۴۰۵/۰۱/۰۱"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-stone-200 text-[12px] focus:outline-none focus:border-stone-500 bg-white"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-[10.5px] text-stone-500 mb-1">تا تاریخ (شمسی)</label>
              <input
                type="text"
                placeholder="مثلاً ۱۴۰۵/۱۲/۲۹"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-stone-200 text-[12px] focus:outline-none focus:border-stone-500 bg-white"
                dir="ltr"
              />
            </div>
          </div>

          {/* Row 3: type + status + branch + sort */}
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
            </Select>
            {isAdmin && (
              <Select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className="h-9 text-[12px] min-w-[110px]">
                <option value="all">همه شعب</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
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

        {/* Results */}
        {filtered.length === 0 ? (
          <Card><CardBody><Empty title="تراکنشی یافت نشد" sub="فیلترها را تغییر دهید" icon={Receipt} /></CardBody></Card>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block bg-white border border-stone-200 rounded-lg overflow-hidden print:block print:border-gray-300">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] print:min-w-0">
                  <thead className="bg-stone-50/50 border-b border-stone-100 print:bg-gray-100">
                    <tr>
                      <Th>عنوان</Th>
                      <Th className="hidden lg:table-cell">دسته</Th>
                      <Th>مبلغ</Th>
                      <Th className="hidden sm:table-cell">تاریخ</Th>
                      <Th className="hidden lg:table-cell">شعبه</Th>
                      <Th>وضعیت</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(tx => {
                      const status = STATUS_META[tx.status];
                      const typeM = TYPE_META[tx.type] ?? TYPE_META['expense']!;
                      const StatusIcon = status.icon;
                      const TypeIcon = typeM.icon;
                      return (
                        <tr
                          key={tx.id}
                          onClick={() => openTx(tx.id)}
                          className={cn(
                            'border-b border-stone-50 last:border-b-0 cursor-pointer transition-colors hover:bg-stone-50/50 print:cursor-default print:hover:bg-transparent',
                            tx.status === 'rejected' && 'opacity-60'
                          )}
                        >
                          <Td>
                            <div className="flex items-center gap-2 min-w-0">
                              <TypeIcon size={13} strokeWidth={1.5} className={cn('flex-shrink-0', typeM.color)} />
                              <div className="min-w-0">
                                <div className="text-[12.5px] text-stone-800 truncate max-w-[180px]">{tx.title}</div>
                                <div className="text-[10.5px] text-stone-400 truncate">{tx.payee}</div>
                              </div>
                            </div>
                          </Td>
                          <Td className="hidden lg:table-cell">
                            <span className="text-[11.5px] text-stone-600">{tx.categoryName || '—'}</span>
                          </Td>
                          <Td>
                            <span className={cn('text-[12.5px] font-medium tabular-nums', typeM.color)}>
                              {tx.type === 'expense' ? '−' : tx.type === 'income' ? '+' : '⇄'}{fmt(tx.amount)}
                            </span>
                          </Td>
                          <Td className="hidden sm:table-cell">
                            <span className="text-[11.5px] text-stone-500">{tx.date}</span>
                          </Td>
                          <Td className="hidden lg:table-cell">
                            <span className="text-[11.5px] text-stone-600">{tx.branch}</span>
                          </Td>
                          <Td>
                            <div className="flex items-center gap-1">
                              <StatusIcon size={12} strokeWidth={1.5} className={
                                tx.status === 'approved' ? 'text-emerald-600' : tx.status === 'pending' ? 'text-amber-600' : 'text-rose-600'
                              } />
                              <span className={cn('text-[10.5px] hidden sm:inline',
                                tx.status === 'approved' ? 'text-emerald-700' : tx.status === 'pending' ? 'text-amber-700' : 'text-rose-700'
                              )}>{status.label}</span>
                            </div>
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-2 print:hidden">
              {filtered.map(tx => {
                const typeM = TYPE_META[tx.type] ?? TYPE_META['expense']!;
                const status = STATUS_META[tx.status];
                const TypeIcon = typeM.icon;
                return (
                  <button
                    key={tx.id}
                    onClick={() => openTx(tx.id)}
                    className={cn(
                      'w-full text-right bg-white border border-stone-200 rounded-lg px-4 py-3 flex items-center gap-3 transition-colors active:bg-stone-50',
                      tx.status === 'rejected' && 'opacity-60'
                    )}
                  >
                    <div className={cn('w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
                      tx.type === 'income' ? 'bg-emerald-50' : tx.type === 'expense' ? 'bg-rose-50' : 'bg-stone-100'
                    )}>
                      <TypeIcon size={16} strokeWidth={1.5} className={typeM.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[13px] text-stone-800 font-medium truncate">{tx.title}</span>
                        <span className={cn('text-[13px] font-medium tabular-nums flex-shrink-0', typeM.color)}>
                          {tx.type === 'expense' ? '−' : tx.type === 'income' ? '+' : '⇄'}{fmt(tx.amount)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10.5px] text-stone-400">{tx.date}</span>
                        <span className="text-[10.5px] text-stone-300">·</span>
                        <span className={cn('text-[10.5px]',
                          tx.status === 'approved' ? 'text-emerald-600' : tx.status === 'pending' ? 'text-amber-600' : 'text-rose-600'
                        )}>{status.label}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {openTxId && (() => {
        const tx = visible.find(t => t.id === openTxId);
        return tx ? <TxDetailPanel tx={tx} onClose={() => openTx(null)} /> : null;
      })()}
    </div>
  );
}
