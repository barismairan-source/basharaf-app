'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, ClipboardList } from 'lucide-react';
import { createRepos } from '@/lib/repos';
import { useAppStore } from '@/store';
import { fmt } from '@/lib/utils';
import { JalaliDatePicker } from '@/components/ui';
import { getTodayJalali, isValidJalaliString } from '@/lib/jalali';
import type { InventoryItem } from '@/types';

const repos = createRepos(null as never);

const UNIT_LABELS: Record<string, string> = {
  kg: 'کیلوگرم', g: 'گرم', L: 'لیتر', ml: 'میلی‌لیتر',
  pcs: 'عدد', can: 'قوطی', pack: 'بسته',
};

export default function StocktakePage() {
  const user = useAppStore((s) => s.user);
  const branches = useAppStore((s) => s.branches);
  const showToast = useAppStore((s) => s.showToast);

  const defaultBranch = (() => {
    if (!user) return '';
    if (user.role !== 'SuperAdmin') return user.assignedBranch ?? '';
    return branches[0]?.id ?? '';
  })();

  const [branchId, setBranchId] = useState(defaultBranch);
  const [date, setDate] = useState(getTodayJalali());
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [counted, setCounted] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isSuperAdmin = user?.role === 'SuperAdmin';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const its = await repos.inventory.listItems();
      setItems(its);
    } catch {
      showToast('خطا در بارگذاری', 'danger');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  if (!user) return null;

  const branchItems = items.filter(
    (it) => it.isActive && (!branchId || it.branchId === branchId)
  );

  const changes = branchItems
    .map((it) => {
      const raw = (counted[it.id] ?? '').replace(/[^0-9.]/g, '');
      if (raw === '') return null;
      const real = parseFloat(raw);
      if (isNaN(real)) return null;
      const diff = real - it.qtyBase;
      if (Math.abs(diff) < 1e-6) return null;
      return { it, real, diff };
    })
    .filter((x): x is { it: InventoryItem; real: number; diff: number } => x !== null);

  async function submit() {
    if (!branchId) { showToast('شعبه را انتخاب کنید', 'danger'); return; }
    if (!isValidJalaliString(date)) { showToast('تاریخ نامعتبر', 'danger'); return; }
    if (changes.length === 0) { showToast('هیچ اختلافی وارد نشده', 'danger'); return; }

    setSaving(true);
    try {
      await (repos.inventory as any).createVoucher({
        kind: 'stocktake',
        branchId,
        date,
        note: `انبارگردانی — ${changes.length} قلم مغایرت`,
        lines: changes.map((c) => ({ itemId: c.it.id, qtyBase: c.real, estUnitCost: 0 })),
      });
      showToast('برگه انبارگردانی ثبت شد (در انتظار تأیید)', 'success');
      setCounted({});
      await load();
    } catch {
      showToast('خطا در ثبت انبارگردانی', 'danger');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
      <h1 className="text-[17px] font-semibold text-text">انبارگردانی</h1>

      <div className="bg-surface border border-border rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11.5px] text-muted">
              شعبه{isSuperAdmin && <span className="text-danger">*</span>}
            </label>
            {isSuperAdmin ? (
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-[13px] mt-1 focus:outline-none focus:ring-1 focus:ring-accent bg-surface text-text"
              >
                <option value="">— انتخاب —</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            ) : (
              <div className="w-full border border-border rounded-lg px-3 py-2.5 text-[13px] mt-1 bg-bg text-muted">
                {branches.find((b) => b.id === branchId)?.name ?? branchId}
              </div>
            )}
          </div>
          <div>
            <label className="text-[11.5px] text-muted">تاریخ</label>
            <div className="mt-1"><JalaliDatePicker value={date} onChange={setDate} /></div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted" /></div>
        ) : !branchId ? (
          <div className="text-center text-muted py-8 text-[13px]">برای شروع، شعبه را انتخاب کنید</div>
        ) : branchItems.length === 0 ? (
          <div className="text-center text-muted py-8 text-[13px]">این شعبه قلمی ندارد</div>
        ) : (
          <>
            <div className="text-[11.5px] text-muted">
              موجودی واقعی شمرده‌شده را وارد کنید. فقط اقلامی که با سیستم فرق دارند ثبت می‌شوند. قیمت لازم نیست.
            </div>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-[12.5px]">
                <thead className="bg-bg text-muted text-[11px]">
                  <tr>
                    <th className="text-right px-3 py-2">قلم</th>
                    <th className="text-left px-3 py-2">سیستم</th>
                    <th className="text-left px-3 py-2">شمارش واقعی</th>
                    <th className="text-left px-3 py-2">اختلاف</th>
                  </tr>
                </thead>
                <tbody>
                  {branchItems.map((it) => {
                    const raw = (counted[it.id] ?? '').replace(/[^0-9.]/g, '');
                    const real = raw === '' ? null : parseFloat(raw);
                    const diff = real == null || isNaN(real) ? null : real - it.qtyBase;
                    return (
                      <tr key={it.id} className="border-t border-border">
                        <td className="px-3 py-2.5 text-text">
                          {it.name}
                          <span className="text-muted text-[11px] mr-1">({UNIT_LABELS[it.unit] ?? it.unit})</span>
                        </td>
                        <td className="px-3 py-2.5 text-left num text-muted">{fmt(it.qtyBase)}</td>
                        <td className="px-3 py-2.5 text-left">
                          <input
                            value={counted[it.id] ?? ''}
                            onChange={(e) => setCounted((c) => ({ ...c, [it.id]: e.target.value }))}
                            dir="ltr"
                            placeholder="—"
                            className="w-24 border border-border rounded px-2 py-1.5 text-[12px] text-left focus:outline-none focus:ring-1 focus:ring-accent bg-surface text-text min-h-[36px]"
                          />
                        </td>
                        <td className={`px-3 py-2.5 text-left num ${diff == null ? 'text-muted' : diff === 0 ? 'text-muted' : diff > 0 ? 'text-ok' : 'text-danger'}`}>
                          {diff == null ? '—' : diff > 0 ? `+${fmt(diff)}` : fmt(diff)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {changes.length > 0 && (
              <div className="bg-warn-subtle border border-warn/20 rounded-lg p-3 text-[12px] text-warn">
                {changes.length} قلم مغایرت دارد — با تأیید در کارتابل، موجودی اصلاح می‌شود.
              </div>
            )}

            <button
              onClick={submit}
              disabled={saving || changes.length === 0}
              className="flex items-center gap-1.5 bg-text text-surface px-4 py-2.5 rounded-lg text-[13px] disabled:opacity-50 min-h-[44px]"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <ClipboardList size={14} />}
              ثبت انبارگردانی
            </button>
          </>
        )}
      </div>
    </div>
  );
}
