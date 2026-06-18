'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Loader2, TrendingUp, FileSpreadsheet } from 'lucide-react';
import { useAppStore } from '@/store';
import { fmt } from '@/lib/utils';
import { JalaliDatePicker, PageHeader } from '@/components/ui';
import { getTodayJalali } from '@/lib/jalali';

type VarianceRow = {
  itemId: string;
  itemName: string;
  unit: string;
  theoreticalQty: number;
  actualQty: number;
  varianceQty: number;
  varianceCost: number;
  avgCost: number;
};

export default function VariancePage() {
  const branches = useAppStore((s) => s.branches);
  const user = useAppStore((s) => s.user);
  const showToast = useAppStore((s) => s.showToast);

  const defaultBranch = (() => {
    if (!user) return '';
    if (user.role !== 'SuperAdmin') return user.assignedBranch ?? '';
    return branches[0]?.id ?? '';
  })();

  const [branchId, setBranchId] = useState(defaultBranch);
  const [dateFrom, setDateFrom] = useState(getTodayJalali());
  const [dateTo, setDateTo] = useState(getTodayJalali());
  const [rows, setRows] = useState<VarianceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [queried, setQueried] = useState(false);

  const isSuperAdmin = user?.role === 'SuperAdmin';

  async function runReport() {
    if (!branchId) { showToast('شعبه را انتخاب کنید', 'danger'); return; }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/inventory/reports/variance?branchId=${branchId}&dateFrom=${dateFrom}&dateTo=${dateTo}`,
        { credentials: 'include' }
      );
      if (!res.ok) { showToast('خطا در دریافت گزارش', 'danger'); return; }
      const data = await res.json();
      setRows(data.rows ?? []);
      setQueried(true);
    } catch {
      showToast('خطا در دریافت گزارش', 'danger');
    } finally {
      setLoading(false);
    }
  }

  function exportExcel() {
    const ws = XLSX.utils.aoa_to_sheet([
      ['قلم', 'واحد', 'مصرف تئوریک', 'مصرف واقعی', 'واریانس (مقدار)', 'واریانس (ریال)'],
      ...rows.map((r) => [r.itemName, r.unit, r.theoreticalQty, r.actualQty, r.varianceQty, r.varianceCost]),
      ['', '', '', '', 'جمع واریانس:', rows.reduce((s, r) => s + r.varianceCost, 0)],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'واریانس');
    XLSX.writeFile(wb, `variance-${dateFrom}-${dateTo}.xlsx`);
  }

  const totalVarianceCost = rows.reduce((s, r) => s + r.varianceCost, 0);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
      <PageHeader title="گزارش واریانس" backHref="/inventory" />

      <div className="bg-surface border border-border rounded-lg p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {isSuperAdmin && (
            <div>
              <label className="text-[11.5px] text-muted">شعبه</label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-[13px] mt-1 focus:outline-none focus:ring-1 focus:ring-accent bg-surface text-text"
              >
                <option value="">— انتخاب —</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-[11.5px] text-muted">از تاریخ</label>
            <div className="mt-1"><JalaliDatePicker value={dateFrom} onChange={setDateFrom} /></div>
          </div>
          <div>
            <label className="text-[11.5px] text-muted">تا تاریخ</label>
            <div className="mt-1"><JalaliDatePicker value={dateTo} onChange={setDateTo} /></div>
          </div>
          <div className={`flex items-end ${isSuperAdmin ? '' : 'sm:col-span-2'}`}>
            <button
              onClick={runReport}
              disabled={loading}
              className="w-full flex items-center justify-center gap-1.5 bg-text text-surface px-3 py-2.5 rounded-lg text-[13px] disabled:opacity-50 min-h-[44px]"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />}
              نمایش
            </button>
          </div>
        </div>
      </div>

      {queried && (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-[12px] text-muted">{rows.length} قلم</span>
            {rows.length > 0 && (
              <button
                onClick={exportExcel}
                className="flex items-center gap-1.5 text-[12px] text-muted hover:text-text min-h-[44px] px-2"
              >
                <FileSpreadsheet size={14} />اکسپورت
              </button>
            )}
          </div>
          {rows.length === 0 ? (
            <div className="text-center text-muted py-10 text-[13px]">
              داده‌ای برای این بازه یافت نشد
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-[12.5px]">
                  <thead className="bg-bg text-muted text-[11px]">
                    <tr>
                      <th className="px-3 py-2 text-right">قلم</th>
                      <th className="px-3 py-2 text-left">مصرف تئوریک</th>
                      <th className="px-3 py-2 text-left">مصرف واقعی</th>
                      <th className="px-3 py-2 text-left">واریانس (مقدار)</th>
                      <th className="px-3 py-2 text-left">واریانس (ریال)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr
                        key={r.itemId}
                        className={`border-t border-border ${Math.abs(r.varianceCost) > 500_000 ? 'bg-warn-subtle' : ''}`}
                      >
                        <td className="px-3 py-2.5 text-text">
                          {r.itemName}
                          <span className="text-muted text-[11px] mr-1">({r.unit})</span>
                        </td>
                        <td className="px-3 py-2.5 text-left num text-muted">
                          {r.theoreticalQty.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2.5 text-left num text-muted">
                          {r.actualQty.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </td>
                        <td className={`px-3 py-2.5 text-left num ${r.varianceQty > 0 ? 'text-danger' : r.varianceQty < 0 ? 'text-ok' : 'text-muted'}`}>
                          {r.varianceQty > 0 ? '+' : ''}{r.varianceQty.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </td>
                        <td className={`px-3 py-2.5 text-left num ${r.varianceCost > 0 ? 'text-danger' : r.varianceCost < 0 ? 'text-ok' : 'text-muted'}`}>
                          {fmt(r.varianceCost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between px-4 py-3 border-t border-border text-[12.5px] font-medium text-text">
                <span>مجموع واریانس دوره</span>
                <span className={`num ${totalVarianceCost > 0 ? 'text-danger' : totalVarianceCost < 0 ? 'text-ok' : 'text-muted'}`}>
                  {fmt(totalVarianceCost)} تومان
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
