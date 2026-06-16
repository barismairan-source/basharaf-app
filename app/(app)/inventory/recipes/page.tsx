'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Loader2, Plus, Trash2, Calculator, Printer, AlertTriangle, X, Check,
} from 'lucide-react';
import type { ToastTone } from '@/components/ui/Toast';
import { createRepos } from '@/lib/repos';
import { useAppStore } from '@/store';
import { fmt, formatNumericInputValue } from '@/lib/utils';
import type { InventoryItem, InventoryRecipe, RecipeCosting } from '@/types';

const repos = createRepos(null as never);

const UNIT_LABELS: Record<string, string> = {
  kg: 'کیلوگرم', g: 'گرم', L: 'لیتر', ml: 'میلی‌لیتر',
  pcs: 'عدد', can: 'قوطی', pack: 'بسته',
};

export default function RecipesPage() {
  const user = useAppStore((s) => s.user);
  const branches = useAppStore((s) => s.branches);
  const showToast = useAppStore((s) => s.showToast);

  const canSeePrices = user?.role !== 'Warehouse';

  const [recipes, setRecipes] = useState<InventoryRecipe[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rs, its] = await Promise.all([
        repos.inventory.listRecipes(),
        repos.inventory.listItems(),
      ]);
      setRecipes(rs);
      setItems(its);
    } catch {
      showToast('خطا در بارگذاری', 'danger');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  if (!user) return null;

  async function deleteRecipe(r: InventoryRecipe) {
    if (!confirm(`رسپی «${r.name}» حذف شود؟`)) return;
    try {
      await repos.inventory.deleteRecipe(r.id!);
      showToast('حذف شد', 'success');
      await load();
    } catch {
      showToast('خطا در حذف', 'danger');
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[17px] font-semibold text-text">رسپی‌ها</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-text text-surface px-3 py-2 rounded-lg text-[12.5px] min-h-[44px]"
        >
          <Plus size={14} />رسپی جدید
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-muted" size={24} /></div>
      ) : recipes.length === 0 ? (
        <div className="text-center text-muted py-12 text-[13px]">هنوز رسپی‌ای ثبت نشده</div>
      ) : (
        <div className="space-y-2">
          {recipes.map((r) => (
            <RecipeCard
              key={r.id}
              recipe={r}
              items={items}
              onDelete={() => deleteRecipe(r)}
              canSeePrices={canSeePrices}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <AddRecipeModal
          items={items}
          branches={branches}
          onClose={() => setShowAdd(false)}
          onDone={async () => { setShowAdd(false); await load(); }}
          showToast={showToast}
        />
      )}
    </div>
  );
}

function RecipeCard({
  recipe, items, onDelete, canSeePrices,
}: {
  recipe: InventoryRecipe;
  items: InventoryItem[];
  onDelete: () => void;
  canSeePrices: boolean;
}) {
  const [costing, setCosting] = useState<RecipeCosting | null>(null);
  const [loadingCost, setLoadingCost] = useState(false);
  const [open, setOpen] = useState(false);

  const portionCalc = useMemo(() => {
    if (!recipe.lines.length || !items.length) return null;
    const byId = new Map(items.map((i) => [i.id, i]));
    let min = Infinity;
    let bottleneck = '';
    for (const line of recipe.lines) {
      const item = byId.get(line.itemId);
      if (!item) continue;
      const yieldPct = (line.overridePct != null ? line.overridePct : item.yieldPct) || 100;
      const netUsable = item.qtyBase * yieldPct / 100;
      const netPerPortion = line.qtyBase / Math.max(1, recipe.portions);
      if (netPerPortion <= 0) continue;
      const possible = Math.floor(netUsable / netPerPortion);
      if (possible < min) { min = possible; bottleneck = item.name; }
    }
    return min === Infinity ? null : { portions: min, bottleneck };
  }, [recipe, items]);

  async function loadCosting() {
    if (costing) { setOpen((o) => !o); return; }
    setLoadingCost(true);
    try {
      const c = await repos.inventory.recipeCosting(recipe.id!);
      setCosting(c); setOpen(true);
    } catch { /* silent */ }
    finally { setLoadingCost(false); }
  }

  function handlePrint() {
    const byId = new Map(items.map((i) => [i.id, i]));
    const rows = recipe.lines.map((line) => {
      const item = byId.get(line.itemId);
      const name = item?.name ?? '—';
      const unit = UNIT_LABELS[item?.unit ?? ''] ?? (item?.unit ?? '');
      const perPortion = line.qtyBase / Math.max(1, recipe.portions);
      const perPortionStr = perPortion >= 1
        ? Math.round(perPortion).toLocaleString('en-US')
        : perPortion.toFixed(2);
      const totalStr = Math.round(line.qtyBase).toLocaleString('en-US');
      return `<tr><td>${name}</td><td>${perPortionStr} ${unit}</td><td>${totalStr} ${unit}</td></tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html dir="rtl" lang="fa"><head>
<meta charset="UTF-8"><title>${recipe.name} — کارت رسپی</title>
<style>
  body{font-family:Tahoma,Arial,sans-serif;padding:2cm;direction:rtl;font-size:14pt;color:#111}
  h1{font-size:20pt;border-bottom:2px solid #333;padding-bottom:.3cm;margin-bottom:.4cm}
  .meta{color:#555;font-size:11pt;margin-bottom:.8cm}
  table{width:100%;border-collapse:collapse;font-size:13pt}
  th{background:#eee;padding:7px 12px;text-align:right;border:1px solid #bbb;font-weight:bold}
  td{padding:7px 12px;border:1px solid #ddd}
  tr:nth-child(even) td{background:#f9f9f9}
  .footer{margin-top:1cm;font-size:10pt;color:#999;border-top:1px solid #eee;padding-top:.3cm}
  @media print{@page{margin:1.5cm}}
</style></head><body>
<h1>${recipe.name}</h1>
<div class="meta">هر پخت: ${recipe.portions} پرس · ${recipe.lines.length} ماده</div>
<table>
  <tr><th>ماده اولیه</th><th>هر پرس</th><th>کل پخت (${recipe.portions} پرس)</th></tr>
  ${rows}
</table>
<div class="footer">بشارف · کارت رسپی آشپزخانه · بدون قیمت</div>
<script>setTimeout(()=>{window.print();},250)</script>
</body></html>`;

    const w = window.open('', '_blank', 'width=750,height=820');
    if (w) { w.document.write(html); w.document.close(); }
  }

  const marginPct = costing?.foodCostPct != null
    ? Math.round((100 - costing.foodCostPct) * 10) / 10
    : null;

  return (
    <div className="bg-surface border border-border rounded-lg p-3">
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0">
          <span className="text-[13px] font-medium text-text">{recipe.name}</span>
          <span className="text-[11px] text-muted mr-2">{recipe.portions} پرس · {recipe.lines.length} ماده</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {portionCalc !== null && (
            <span
              className={`text-[11px] px-1.5 py-0.5 rounded-md num font-medium ${
                portionCalc.portions === 0
                  ? 'bg-danger-subtle text-danger'
                  : portionCalc.portions < recipe.portions
                  ? 'bg-warn-subtle text-warn'
                  : 'bg-ok-subtle text-ok'
              }`}
              title={`گلوگاه: ${portionCalc.bottleneck}`}
            >
              {portionCalc.portions} پرس
            </span>
          )}
          <button
            onClick={handlePrint}
            className="w-11 h-11 flex items-center justify-center text-muted hover:text-text rounded-lg"
            title="چاپ کارت رسپی"
          >
            <Printer size={14} strokeWidth={1.5} />
          </button>
          {canSeePrices && (
            <button
              onClick={loadCosting}
              className="w-11 h-11 flex items-center justify-center text-muted hover:text-text rounded-lg"
              title="بهای تمام‌شده"
            >
              {loadingCost
                ? <Loader2 size={14} className="animate-spin" />
                : <Calculator size={14} strokeWidth={1.5} />}
            </button>
          )}
          <button
            onClick={onDelete}
            className="w-11 h-11 flex items-center justify-center text-muted hover:text-danger rounded-lg"
          >
            <Trash2 size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {portionCalc !== null && portionCalc.portions === 0 && (
        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-danger">
          <AlertTriangle size={11} />موجودی کافی نیست · گلوگاه: {portionCalc.bottleneck}
        </div>
      )}
      {portionCalc !== null && portionCalc.portions > 0 && portionCalc.portions < recipe.portions && (
        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-warn">
          <AlertTriangle size={11} />کمتر از یک پخت کامل · گلوگاه: {portionCalc.bottleneck}
        </div>
      )}

      {open && costing && (
        <div className="mt-3 pt-3 border-t border-border space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            {[
              { label: 'بهای هر پرس', value: fmt(costing.costPerPortion) },
              { label: 'قیمت فروش', value: costing.price > 0 ? fmt(costing.price) : '—' },
              {
                label: 'food cost',
                value: costing.foodCostPct != null ? `٪${costing.foodCostPct}` : '—',
                color: costing.foodCostPct != null && costing.foodCostPct > costing.targetFcPct ? 'text-danger' : 'text-ok',
              },
              {
                label: 'حاشیه سود',
                value: marginPct !== null ? `٪${marginPct}` : '—',
                color: marginPct !== null ? (marginPct < 30 ? 'text-danger' : 'text-ok') : undefined,
              },
            ].map((stat) => (
              <div key={stat.label} className="bg-bg rounded-lg p-2">
                <div className="text-[10px] text-muted">{stat.label}</div>
                <div className={`text-[13px] font-medium num ${stat.color ?? 'text-text'}`}>{stat.value}</div>
              </div>
            ))}
          </div>

          {costing.price > 0 && Math.abs(costing.suggestedPrice - costing.price) > costing.price * 0.05 && (
            <div className="text-[11px] text-muted flex items-center gap-1">
              قیمت پیشنهادی (بر اساس ٪{costing.targetFcPct} food cost):
              <span className="font-medium text-text num">{fmt(costing.suggestedPrice)}</span>
            </div>
          )}

          {costing.hasMissingCosts && (
            <div className="text-[11px] text-warn flex items-center gap-1">
              <AlertTriangle size={12} />
              بعضی مواد هنوز قیمت ندارند (با ثبت رسید خرید قیمت می‌گیرند).
            </div>
          )}

          <div className="space-y-1">
            {costing.lines.map((l, i) => (
              <div key={i} className="flex justify-between text-[11.5px] text-muted">
                <span className="text-text">{l.name} <span className="text-muted">({fmt(l.qtyBase)} {l.unit})</span></span>
                <span className="num">{fmt(l.lineCost)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[12px] font-medium text-text pt-1.5 border-t border-border">
            <span>جمع کل پخت ({costing.portions} پرس)</span>
            <span className="num">{fmt(costing.totalCost)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function AddRecipeModal({
  items, branches, onClose, onDone, showToast,
}: {
  items: InventoryItem[];
  branches: { id: string; name: string }[];
  onClose: () => void;
  onDone: () => void;
  showToast: (m: string, t?: ToastTone) => void;
}) {
  const [name, setName] = useState('');
  const [branchId, setBranchId] = useState('');
  const [portions, setPortions] = useState('1');
  const [price, setPrice] = useState('');
  const [lines, setLines] = useState<{ itemId: string; qty: string }[]>([{ itemId: '', qty: '' }]);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) { showToast('نام رسپی الزامی است', 'danger'); return; }
    const valid = lines.filter(
      (l) => l.itemId && parseInt(l.qty.replace(/\D/g, ''), 10) > 0
    );
    if (valid.length === 0) { showToast('حداقل یک ماده', 'danger'); return; }
    setSaving(true);
    try {
      await repos.inventory.saveRecipe({
        id: null,
        name: name.trim(),
        branchId: branchId || null,
        portions: parseInt(portions, 10) || 1,
        targetFcPct: 30,
        price: price ? parseInt(price.replace(/\D/g, ''), 10) : 0,
        cookMode: 'daily',
        shelfLifeDays: 1,
        lines: valid.map((l) => ({
          itemId: l.itemId,
          qtyBase: parseInt(l.qty.replace(/\D/g, ''), 10),
        })),
      } as InventoryRecipe);
      showToast('رسپی ذخیره شد', 'success');
      onDone();
    } catch {
      showToast('خطا در ذخیره', 'danger');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-medium text-text">رسپی جدید</h2>
          <button onClick={onClose} className="w-11 h-11 flex items-center justify-center text-muted hover:text-text">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-[11.5px] text-muted">نام غذا</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-[13px] mt-1 focus:outline-none focus:ring-1 focus:ring-accent bg-surface text-text"
              placeholder="چلوکباب کوبیده"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11.5px] text-muted">تعداد پرس</label>
              <input
                value={portions}
                onChange={(e) => setPortions(e.target.value.replace(/\D/g, ''))}
                dir="ltr"
                className="w-full border border-border rounded-lg px-3 py-2.5 text-[13px] mt-1 focus:outline-none focus:ring-1 focus:ring-accent bg-surface text-text"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[11.5px] text-muted">قیمت فروش (تومان)</label>
              <input
                value={price}
                onChange={(e) => setPrice(formatNumericInputValue(e.target))}
                dir="ltr"
                className="w-full border border-border rounded-lg px-3 py-2.5 text-[13px] mt-1 focus:outline-none focus:ring-1 focus:ring-accent bg-surface text-text"
              />
            </div>
          </div>
          <div>
            <label className="text-[11.5px] text-muted">شعبه</label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-[13px] mt-1 focus:outline-none focus:ring-1 focus:ring-accent bg-surface text-text"
            >
              <option value="">— همه —</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[11.5px] text-muted">مواد (مقدار به واحد پایه برای کل رسپی)</label>
            {lines.map((l, i) => (
              <div key={i} className="flex gap-2">
                <select
                  value={l.itemId}
                  onChange={(e) => setLines((prev) => prev.map((x, idx) => idx === i ? { ...x, itemId: e.target.value } : x))}
                  className="flex-1 border border-border rounded-lg px-2 py-2 text-[12.5px] focus:outline-none focus:ring-1 focus:ring-accent bg-surface text-text"
                >
                  <option value="">— ماده —</option>
                  {items.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
                </select>
                <input
                  value={l.qty}
                  onChange={(e) => {
                    const formatted = formatNumericInputValue(e.target);
                    setLines((prev) => prev.map((x, idx) => idx === i ? { ...x, qty: formatted } : x));
                  }}
                  dir="ltr"
                  placeholder="مقدار"
                  className="w-28 border border-border rounded-lg px-2 py-2 text-[12.5px] focus:outline-none focus:ring-1 focus:ring-accent bg-surface text-text"
                />
                {lines.length > 1 && (
                  <button
                    onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
                    className="w-11 h-11 flex items-center justify-center text-muted hover:text-danger"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => setLines((prev) => [...prev, { itemId: '', qty: '' }])}
              className="flex items-center gap-1 text-[12px] text-muted hover:text-text py-1"
            >
              <Plus size={13} />افزودن ماده
            </button>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 bg-text text-surface px-4 py-2.5 rounded-lg text-[13px] disabled:opacity-50 min-h-[44px]"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            ذخیره
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-[13px] border border-border text-muted min-h-[44px]"
          >
            لغو
          </button>
        </div>
      </div>
    </div>
  );
}
