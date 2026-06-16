'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, TrendingUp } from 'lucide-react';
import { createRepos } from '@/lib/repos';
import { useAppStore } from '@/store';
import { fmt } from '@/lib/utils';
import { JalaliDatePicker } from '@/components/ui';
import { getTodayJalali, isValidJalaliString } from '@/lib/jalali';
import type { InventoryRecipe } from '@/types';

const repos = createRepos(null as never);

export default function SalesPage() {
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
  const [recipes, setRecipes] = useState<InventoryRecipe[]>([]);
  const [qtys, setQtys] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isSuperAdmin = user?.role === 'SuperAdmin';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rs = await repos.inventory.listRecipes();
      setRecipes(rs);
    } catch {
      showToast('خطا در بارگذاری رسپی‌ها', 'danger');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  if (!user) return null;

  const branchRecipes = recipes.filter(
    (r) => !branchId || !r.branchId || r.branchId === branchId
  );

  const sold = branchRecipes
    .map((r) => ({ recipe: r, count: parseInt((qtys[r.id!] ?? '').replace(/\D/g, ''), 10) || 0 }))
    .filter((x) => x.count > 0);

  const revenue = sold.reduce((s, x) => s + x.recipe.price * x.count, 0);

  async function submit() {
    if (!branchId) { showToast('شعبه را انتخاب کنید', 'danger'); return; }
    if (!isValidJalaliString(date)) { showToast('تاریخ شمسی نامعتبر است', 'danger'); return; }
    if (sold.length === 0) { showToast('حداقل یک فروش وارد کنید', 'danger'); return; }

    const itemTotals: Record<string, number> = {};
    for (const { recipe, count } of sold) {
      const factor = count / Math.max(1, recipe.portions);
      for (const line of recipe.lines) {
        itemTotals[line.itemId] = (itemTotals[line.itemId] ?? 0) + line.qtyBase * factor;
      }
    }
    const lines = Object.entries(itemTotals).map(([itemId, qtyBase]) => ({
      itemId,
      qtyBase: Math.round(qtyBase),
    }));
    if (lines.length === 0) { showToast('رسپی‌های انتخابی ماده ندارند', 'danger'); return; }

    setSaving(true);
    try {
      await (repos.inventory as any).createVoucher({
        kind: 'sale',
        branchId,
        date,
        note: `فروش روزانه — ${sold.length} نوع غذا`,
        lines,
        saleMeta: {
          revenue,
          lines: sold.map((x) => ({
            recipeId: x.recipe.id,
            name: x.recipe.name,
            count: x.count,
            unitPrice: x.recipe.price,
          })),
        },
      });
      showToast('فروش ثبت شد (در انتظار تأیید)', 'success');
      setQtys({});
    } catch {
      showToast('خطا در ثبت فروش', 'danger');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
      <h1 className="text-[17px] font-semibold text-text">ثبت فروش روزانه</h1>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-muted" size={24} /></div>
      ) : branchRecipes.length === 0 ? (
        <div className="text-center text-muted py-12 text-[13px]">
          اول باید رسپی بسازید تا بتوانید فروش ثبت کنید
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {isSuperAdmin ? (
              <div>
                <label className="text-[11.5px] text-muted">شعبه<span className="text-danger">*</span></label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-[13px] mt-1 focus:outline-none focus:ring-1 focus:ring-accent bg-surface text-text"
                >
                  <option value="">— انتخاب —</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <label className="text-[11.5px] text-muted">شعبه</label>
                <div className="w-full border border-border rounded-lg px-3 py-2.5 text-[13px] mt-1 bg-bg text-muted">
                  {branches.find((b) => b.id === branchId)?.name ?? branchId}
                </div>
              </div>
            )}
            <div>
              <label className="text-[11.5px] text-muted">تاریخ</label>
              <div className="mt-1"><JalaliDatePicker value={date} onChange={setDate} /></div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11.5px] text-muted">تعداد فروش هر غذا</label>
            {branchRecipes.map((r) => (
              <div key={r.id} className="flex items-center gap-2 py-0.5">
                <span className="flex-1 text-[13px] text-text">{r.name}</span>
                <span className="text-[11px] text-muted num">{fmt(r.price)} ت</span>
                <input
                  value={qtys[r.id!] ?? ''}
                  onChange={(e) => {
                    const n = parseInt(e.target.value.replace(/\D/g, ''), 10) || 0;
                    setQtys((q) => ({ ...q, [r.id!]: n ? String(n) : '' }));
                  }}
                  dir="ltr"
                  placeholder="۰"
                  className="w-20 h-11 border border-border rounded-lg px-2 text-[13px] text-center focus:outline-none focus:ring-1 focus:ring-accent bg-surface text-text"
                />
              </div>
            ))}
          </div>

          {sold.length > 0 && (
            <div className="bg-bg rounded-lg p-3 flex justify-between text-[13px]">
              <span className="text-muted">جمع فروش ({sold.reduce((s, x) => s + x.count, 0)} پرس)</span>
              <span className="font-medium text-text num">{fmt(revenue)} تومان</span>
            </div>
          )}

          <button
            onClick={submit}
            disabled={saving || !branchId}
            className="flex items-center gap-1.5 bg-text text-surface px-4 py-2.5 rounded-lg text-[13px] disabled:opacity-50 min-h-[44px]"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />}
            ثبت فروش
          </button>
          <p className="text-[11px] text-muted">
            با تأیید این برگه در کارتابل، مواد لازم خودکار از موجودی انبار کم می‌شوند.
          </p>
        </div>
      )}
    </div>
  );
}
