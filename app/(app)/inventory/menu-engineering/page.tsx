'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Star, Tractor, Puzzle, Dog } from 'lucide-react';
import { useAppStore } from '@/store';
import { JalaliDatePicker, PageHeader } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { MenuEngineItem } from '@/app/api/inventory/reports/menu-engineering/route';

// ─── مشخصات هر ربع ───────────────────────────────────────────────
const QUADRANT_META: Record<MenuEngineItem['quadrant'], {
  label: string; labelEn: string; color: string; bg: string; border: string; action: string;
}> = {
  star:      { label: 'ستاره',    labelEn: 'Star',      color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200', action: 'حفظ کیفیت و افزایش فروش؛ قیمت را با احتیاط بالا ببر.' },
  plowhorse: { label: 'گاو کار',  labelEn: 'Plowhorse', color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200',  action: 'بهای تمام‌شده را کاهش بده یا قیمت را اندکی بالا ببر.' },
  puzzle:    { label: 'معما',     labelEn: 'Puzzle',    color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', action: 'بازاریابی و دیده‌شدن در منو را تقویت کن.' },
  dog:       { label: 'سگ',       labelEn: 'Dog',       color: 'text-stone-500',  bg: 'bg-stone-50',  border: 'border-stone-200', action: 'از منو حذف یا جای‌گذاری کن؛ ارزش نگهداری پایین است.' },
};

const QUADRANT_ICONS: Record<MenuEngineItem['quadrant'], React.ReactNode> = {
  star:      <Star      size={14} strokeWidth={1.5} />,
  plowhorse: <Tractor   size={14} strokeWidth={1.5} />,
  puzzle:    <Puzzle    size={14} strokeWidth={1.5} />,
  dog:       <Dog       size={14} strokeWidth={1.5} />,
};

function fmt(n: number) {
  return n.toLocaleString('fa-IR');
}

export default function MenuEngineeringPage() {
  const branches = useAppStore((s) => s.branches);
  const user = useAppStore((s) => s.user);
  const showToast = useAppStore((s) => s.showToast);

  const defaultBranch = (() => {
    if (!user || user.role === 'SuperAdmin') return branches[0]?.id ?? '';
    return user.assignedBranch ?? branches[0]?.id ?? '';
  })();

  const [branchId, setBranchId] = useState(defaultBranch);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<MenuEngineItem[]>([]);
  const [ran, setRan] = useState(false);
  const [tooFew, setTooFew] = useState(false);
  const [count, setCount] = useState(0);

  async function runReport() {
    if (!branchId) { showToast('شعبه را انتخاب کنید', 'danger'); return; }
    if (!dateFrom || !dateTo) { showToast('بازه‌ی تاریخ را وارد کنید', 'danger'); return; }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/inventory/reports/menu-engineering?branchId=${branchId}&dateFrom=${dateFrom}&dateTo=${dateTo}`,
        { credentials: 'include' },
      );
      const data = await res.json() as { items: MenuEngineItem[]; tooFew: boolean; count: number };
      setItems(data.items);
      setTooFew(data.tooFew);
      setCount(data.count);
      setRan(true);
    } catch {
      showToast('خطا در دریافت گزارش', 'danger');
    } finally {
      setLoading(false);
    }
  }

  function exportExcel() {
    if (!items.length) return;
    const header = ['نام آیتم', 'تعداد فروش', 'قیمت فروش', 'بهای تمام‌شده', 'حاشیه سود', 'ربع'];
    const rows = items.map((it) => [
      it.name,
      it.unitsSold,
      it.unitPrice,
      it.unitCost,
      it.unitMargin,
      QUADRANT_META[it.quadrant].label,
    ]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'مهندسی منو');
    XLSX.writeFile(wb, `menu-engineering-${dateFrom}-${dateTo}.xlsx`);
  }

  if (!user) return null;

  const byQuadrant = (q: MenuEngineItem['quadrant']) => items.filter((it) => it.quadrant === q);

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
      <PageHeader title="مهندسی منو" backHref="/inventory/kitchen" />

      {/* ─── فیلتر ─── */}
      <div className="bg-surface border border-border rounded-xl p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {user.role === 'SuperAdmin' && branches.length > 1 && (
            <div>
              <label className="block text-[11px] text-muted mb-1">شعبه</label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full text-[12px] border border-border rounded-lg px-3 py-2 bg-bg text-text focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-[11px] text-muted mb-1">از تاریخ</label>
            <JalaliDatePicker value={dateFrom} onChange={setDateFrom} />
          </div>
          <div>
            <label className="block text-[11px] text-muted mb-1">تا تاریخ</label>
            <JalaliDatePicker value={dateTo} onChange={setDateTo} />
          </div>
        </div>
        <button
          onClick={runReport}
          disabled={loading}
          className="w-full sm:w-auto px-6 py-2 rounded-lg bg-accent text-white text-[13px] font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'در حال محاسبه...' : 'نمایش گزارش'}
        </button>
      </div>

      {/* ─── حالت‌های خالی ─── */}
      {ran && tooFew && (
        <div className="text-center py-10 text-[13px] text-muted">
          تعداد آیتم‌های فروخته‌شده ({count}) برای ماتریس کافی نیست (حداقل ۳ آیتم لازم است).
        </div>
      )}

      {ran && !tooFew && items.length === 0 && (
        <div className="text-center py-10 text-[13px] text-muted">
          داده‌ای در این بازه یافت نشد.
        </div>
      )}

      {items.length > 0 && (
        <>
          {/* ─── ماتریس ۲×۲ ─── */}
          <div>
            <h2 className="text-[13.5px] font-semibold text-text mb-3">ماتریس مهندسی منو</h2>
            <div className="grid grid-cols-2 gap-3">
              {(['star', 'puzzle', 'plowhorse', 'dog'] as MenuEngineItem['quadrant'][]).map((q) => {
                const meta = QUADRANT_META[q];
                const qItems = byQuadrant(q);
                return (
                  <div key={q} className={cn('rounded-xl border p-4', meta.bg, meta.border)}>
                    <div className={cn('flex items-center gap-1.5 mb-2', meta.color)}>
                      {QUADRANT_ICONS[q]}
                      <span className="text-[12px] font-semibold">{meta.label}</span>
                      <span className="text-[10px] opacity-60 mr-auto">{meta.labelEn}</span>
                    </div>
                    {qItems.length === 0 ? (
                      <p className="text-[11px] text-muted">—</p>
                    ) : (
                      <ul className="space-y-1">
                        {qItems.map((it) => (
                          <li key={it.recipeId} className="text-[12px] text-text leading-snug">
                            {it.name}
                            <span className="text-[10px] text-muted mr-1 tabular-nums">({fmt(it.unitsSold)} عدد)</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="mt-3 text-[10.5px] text-muted leading-relaxed border-t border-current/10 pt-2">{meta.action}</p>
                  </div>
                );
              })}
            </div>
            <p className="text-[10.5px] text-muted mt-2">
              محور عمودی: محبوبیت (تعداد فروش) · محور افقی: سودآوری (حاشیه سود واحد)
            </p>
          </div>

          {/* ─── جدول جزئیات ─── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[13.5px] font-semibold text-text">جدول جزئیات</h2>
              <button
                onClick={exportExcel}
                className="text-[12px] text-accent hover:underline"
              >
                خروجی اکسل
              </button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border bg-bg">
                    <th className="text-right px-4 py-2.5 font-medium text-muted">نام آیتم</th>
                    <th className="text-center px-3 py-2.5 font-medium text-muted whitespace-nowrap">تعداد فروش</th>
                    <th className="text-center px-3 py-2.5 font-medium text-muted whitespace-nowrap">قیمت فروش</th>
                    <th className="text-center px-3 py-2.5 font-medium text-muted whitespace-nowrap">بهای تمام‌شده</th>
                    <th className="text-center px-3 py-2.5 font-medium text-muted whitespace-nowrap">حاشیه سود</th>
                    <th className="text-center px-3 py-2.5 font-medium text-muted">ربع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((it) => {
                    const meta = QUADRANT_META[it.quadrant];
                    return (
                      <tr key={it.recipeId} className="hover:bg-bg/50 transition-colors">
                        <td className="px-4 py-3 text-text">{it.name}</td>
                        <td className="px-3 py-3 text-center tabular-nums text-text">{fmt(it.unitsSold)}</td>
                        <td className="px-3 py-3 text-center tabular-nums text-muted">{fmt(it.unitPrice)}</td>
                        <td className="px-3 py-3 text-center tabular-nums text-muted">{fmt(it.unitCost)}</td>
                        <td className={cn('px-3 py-3 text-center tabular-nums font-medium', it.unitMargin >= 0 ? 'text-ok' : 'text-danger')}>
                          {fmt(it.unitMargin)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium', meta.bg, meta.color, meta.border, 'border')}>
                            {QUADRANT_ICONS[it.quadrant]}
                            {meta.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
