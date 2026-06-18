'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Loader2, Plus, Trash2, Calculator, Printer, AlertTriangle, X, Check, Search,
  ArrowLeft, ArrowRight,
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

const UNIT_SHORT: Record<string, string> = {
  kg: 'kg', g: 'g', L: 'L', ml: 'ml', pcs: 'عدد', can: 'قوطی', pack: 'بسته',
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
        <AddRecipeWizard
          items={items}
          branches={branches}
          canSeePrices={canSeePrices}
          onClose={() => setShowAdd(false)}
          onDone={async () => { setShowAdd(false); await load(); }}
          showToast={showToast}
        />
      )}
    </div>
  );
}

// ─── RecipeCard ──────────────────────────────────────────────────

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

// ─── 3-step Recipe Wizard ────────────────────────────────────────

type WizardStep = 1 | 2 | 3;
interface WizardLine { itemId: string; qty: string; }

function AddRecipeWizard({
  items, branches, canSeePrices, onClose, onDone, showToast,
}: {
  items: InventoryItem[];
  branches: { id: string; name: string }[];
  canSeePrices: boolean;
  onClose: () => void;
  onDone: () => void;
  showToast: (m: string, t?: ToastTone) => void;
}) {
  const [step, setStep] = useState<WizardStep>(1);

  // Step 1
  const [name, setName] = useState('');
  const [cookMode, setCookMode] = useState<'daily' | 'batch'>('daily');
  const [portions, setPortions] = useState('1');
  const [branchId, setBranchId] = useState('');

  // Step 2
  const [lines, setLines] = useState<WizardLine[]>([]);
  const [search, setSearch] = useState('');

  // Step 3
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);

  const portionsNum = parseInt(portions, 10) || 1;
  const priceNum = parseInt(price.replace(/[^0-9]/g, ''), 10) || 0;

  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  // Live cost — pure client calc using items' avgCostPerBase + yieldPct
  const liveCost = useMemo(() => {
    let total = 0;
    for (const line of lines) {
      const item = itemById.get(line.itemId);
      const qty = parseInt(line.qty, 10) || 0;
      if (!item || qty === 0 || item.avgCostPerBase <= 0) continue;
      const yieldFactor = Math.max(1, item.yieldPct || 100) / 100;
      total += (qty * item.avgCostPerBase) / yieldFactor;
    }
    const totalCost = Math.round(total);
    return { totalCost, costPerPortion: Math.round(totalCost / portionsNum) };
  }, [lines, itemById, portionsNum]);

  const foodCostPct =
    priceNum > 0 && liveCost.costPerPortion > 0
      ? Math.round((liveCost.costPerPortion / priceNum) * 1000) / 10
      : null;

  const fcColorClass =
    foodCostPct == null ? 'text-muted' :
    foodCostPct < 30   ? 'text-ok' :
    foodCostPct < 40   ? 'text-warn' :
                         'text-danger';

  const fcBgClass =
    foodCostPct == null ? 'bg-border/20 text-muted' :
    foodCostPct < 30   ? 'bg-ok-subtle text-ok' :
    foodCostPct < 40   ? 'bg-warn-subtle text-warn' :
                         'bg-danger-subtle text-danger';

  // Search results for step 2
  const filteredItems = useMemo(() => {
    const q = search.trim();
    if (!q) return [];
    return items
      .filter((it) => it.isActive && (it.name.includes(q) || it.code.includes(q)))
      .slice(0, 12);
  }, [search, items]);

  const selectedIds = useMemo(() => new Set(lines.map((l) => l.itemId)), [lines]);

  function addLine(itemId: string) {
    if (selectedIds.has(itemId)) return;
    setLines((prev) => [...prev, { itemId, qty: '' }]);
    setSearch('');
  }

  function removeLine(itemId: string) {
    setLines((prev) => prev.filter((l) => l.itemId !== itemId));
  }

  function setLineQty(itemId: string, val: string) {
    setLines((prev) =>
      prev.map((l) => l.itemId === itemId ? { ...l, qty: val.replace(/\D/g, '') } : l)
    );
  }

  function goNext() {
    if (step === 1) {
      if (!name.trim()) { showToast('نام غذا را وارد کنید', 'danger'); return; }
      setStep(2);
    } else if (step === 2) {
      const valid = lines.filter((l) => l.itemId && parseInt(l.qty, 10) > 0);
      if (valid.length === 0) { showToast('حداقل یک ماده با مقدار وارد کنید', 'danger'); return; }
      setStep(3);
    }
  }

  function goPrev() {
    if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
  }

  async function save() {
    const validLines = lines.filter((l) => l.itemId && parseInt(l.qty, 10) > 0);
    setSaving(true);
    try {
      await repos.inventory.saveRecipe({
        id: null,
        name: name.trim(),
        branchId: branchId || null,
        portions: portionsNum,
        targetFcPct: 30,
        price: priceNum,
        cookMode,
        shelfLifeDays: 1,
        lines: validLines.map((l) => ({
          itemId: l.itemId,
          qtyBase: parseInt(l.qty, 10),
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

  const stepLabels = ['نام و نوع', 'مواد', 'قیمت'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg max-h-[92dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header + Step progress */}
        <div className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-semibold text-text">رسپی جدید</h2>
            <button onClick={onClose} className="w-11 h-11 flex items-center justify-center text-muted hover:text-text">
              <X size={18} />
            </button>
          </div>
          <div className="flex items-center gap-1">
            {([1, 2, 3] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-1 flex-1 min-w-0">
                <div className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0 transition-colors ${
                  s < step  ? 'bg-text/50 text-surface' :
                  s === step ? 'bg-text text-surface' :
                               'bg-border text-muted'
                }`}>
                  {s < step ? <Check size={10} /> : s}
                </div>
                <span className={`text-[10.5px] truncate transition-colors ${s === step ? 'text-text font-medium' : 'text-muted'}`}>
                  {stepLabels[i]}
                </span>
                {s < 3 && <div className="flex-1 h-px bg-border mx-1 shrink-0" style={{ minWidth: 8 }} />}
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4">

          {/* ── Step 1: Name & cook type ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-[11.5px] text-muted block mb-1">نام غذا</label>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-[13px] focus:outline-none focus:ring-1 focus:ring-accent bg-surface text-text"
                  placeholder="مثال: چلوکباب کوبیده"
                />
              </div>

              <div>
                <label className="text-[11.5px] text-muted block mb-1.5">نوع پخت</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['daily', 'batch'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setCookMode(mode)}
                      className={`py-2.5 rounded-lg text-[12.5px] border transition-colors ${
                        cookMode === mode
                          ? 'border-text bg-text text-surface'
                          : 'border-border text-muted hover:border-text/40'
                      }`}
                    >
                      {mode === 'daily' ? 'پخت روزانه' : 'پخت دسته‌ای'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11.5px] text-muted block mb-1">تعداد پرس</label>
                  <input
                    value={portions}
                    onChange={(e) => setPortions(e.target.value.replace(/\D/g, '') || '1')}
                    dir="ltr"
                    inputMode="numeric"
                    className="w-full border border-border rounded-lg px-3 py-2.5 text-[13px] focus:outline-none focus:ring-1 focus:ring-accent bg-surface text-text"
                  />
                </div>
                <div>
                  <label className="text-[11.5px] text-muted block mb-1">شعبه</label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full border border-border rounded-lg px-3 py-2.5 text-[13px] focus:outline-none focus:ring-1 focus:ring-accent bg-surface text-text"
                  >
                    <option value="">— همه —</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Ingredient search & selection ── */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="relative">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full border border-border rounded-lg pr-9 pl-3 py-2.5 text-[13px] focus:outline-none focus:ring-1 focus:ring-accent bg-surface text-text"
                  placeholder="جستجو در مواد و نیمه‌آماده‌ها..."
                />
              </div>

              {/* Search results */}
              {filteredItems.length > 0 && (
                <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
                  {filteredItems.map((it) => {
                    const alreadyAdded = selectedIds.has(it.id);
                    return (
                      <button
                        key={it.id}
                        onClick={() => addLine(it.id)}
                        disabled={alreadyAdded}
                        className={`w-full flex items-center justify-between px-3 py-2.5 text-right transition-colors ${
                          alreadyAdded ? 'opacity-40 cursor-default' : 'hover:bg-bg'
                        }`}
                      >
                        <span className="text-[12.5px] text-text">{it.name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            it.kind === 'prep'
                              ? 'bg-accent/10 text-accent'
                              : 'bg-bg text-muted border border-border'
                          }`}>
                            {it.kind === 'prep' ? 'نیمه‌آماده' : 'ماده اولیه'}
                          </span>
                          {alreadyAdded
                            ? <Check size={13} className="text-ok" />
                            : <Plus size={13} className="text-muted" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Empty hint */}
              {!search && lines.length === 0 && (
                <div className="text-center text-[12.5px] text-muted py-8 bg-bg rounded-xl">
                  نام ماده یا نیمه‌آماده را تایپ کنید تا انتخاب کنید
                </div>
              )}

              {/* Selected lines with quantity inputs */}
              {lines.length > 0 && (
                <div>
                  <div className="text-[11px] text-muted mb-2">مواد انتخاب‌شده ({lines.length})</div>
                  <div className="space-y-1.5">
                    {lines.map((l) => {
                      const item = itemById.get(l.itemId);
                      if (!item) return null;
                      const unitLabel = UNIT_SHORT[item.unit] ?? item.unit;
                      return (
                        <div key={l.itemId} className="flex items-center gap-2 bg-bg rounded-lg px-3 py-2">
                          <span className="flex-1 text-[12.5px] text-text truncate min-w-0">{item.name}</span>
                          <input
                            value={l.qty}
                            onChange={(e) => setLineQty(l.itemId, e.target.value)}
                            dir="ltr"
                            inputMode="numeric"
                            placeholder="مقدار"
                            className="w-20 border border-border rounded-md px-2 py-1 text-[12.5px] text-center focus:outline-none focus:ring-1 focus:ring-accent bg-surface text-text shrink-0"
                          />
                          <span className="text-[11px] text-muted w-8 text-center shrink-0">{unitLabel}</span>
                          <button
                            onClick={() => removeLine(l.itemId)}
                            className="w-8 h-8 flex items-center justify-center text-muted hover:text-danger shrink-0"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Price & food cost ── */}
          {step === 3 && (
            <div className="space-y-4">
              {canSeePrices && (
                <div>
                  <label className="text-[11.5px] text-muted block mb-1">قیمت فروش هر پرس (تومان)</label>
                  <input
                    autoFocus
                    value={price}
                    onChange={(e) => setPrice(formatNumericInputValue(e.target))}
                    dir="ltr"
                    inputMode="numeric"
                    className="w-full border border-border rounded-lg px-3 py-2.5 text-[13px] focus:outline-none focus:ring-1 focus:ring-accent bg-surface text-text"
                    placeholder="۱۵۰٬۰۰۰"
                  />
                  <p className="text-[11px] text-muted mt-1">
                    اگر قیمت هنوز مشخص نیست، می‌توانید بدون قیمت ذخیره کنید.
                  </p>
                </div>
              )}

              {/* Cost & food cost summary */}
              <div className="bg-bg rounded-xl p-4 space-y-3">
                <div className="text-[11px] text-muted font-medium">خلاصه این رسپی</div>
                <div className="flex justify-between text-[12.5px]">
                  <span className="text-muted">بهای هر پرس</span>
                  <span className="font-medium text-text num">
                    {liveCost.costPerPortion > 0 ? `${fmt(liveCost.costPerPortion)} تومان` : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-[12.5px]">
                  <span className="text-muted">بهای کل ({portionsNum} پرس)</span>
                  <span className="font-medium text-text num">
                    {liveCost.totalCost > 0 ? `${fmt(liveCost.totalCost)} تومان` : '—'}
                  </span>
                </div>
                {liveCost.costPerPortion === 0 && (
                  <div className="text-[11px] text-warn flex items-center gap-1">
                    <AlertTriangle size={11} />
                    بعضی مواد هنوز قیمت ندارند — پس از ثبت رسید خرید به‌روز می‌شود.
                  </div>
                )}

                {canSeePrices && priceNum > 0 && (
                  <>
                    <div className="h-px bg-border" />
                    <div className="flex justify-between text-[12.5px]">
                      <span className="text-muted">food cost</span>
                      <span className={`font-semibold num ${fcColorClass}`}>
                        {foodCostPct !== null ? `٪${foodCostPct}` : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between text-[12.5px]">
                      <span className="text-muted">حاشیه سود</span>
                      <span className={`font-medium num ${
                        foodCostPct !== null
                          ? (100 - foodCostPct) >= 30 ? 'text-ok' : 'text-danger'
                          : 'text-muted'
                      }`}>
                        {foodCostPct !== null ? `٪${Math.round((100 - foodCostPct) * 10) / 10}` : '—'}
                      </span>
                    </div>
                    <div className={`text-[11.5px] text-center py-1.5 rounded-lg font-medium ${fcBgClass}`}>
                      {foodCostPct == null ? 'قیمت وارد نشده' :
                       foodCostPct < 30 ? 'food cost ایده‌آل ✓' :
                       foodCostPct < 40 ? 'food cost قابل قبول' :
                       'food cost بالاست — قیمت را بررسی کنید'}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Live cost bar — step 2 only */}
        {step === 2 && lines.length > 0 && liveCost.totalCost > 0 && (
          <div className="border-t border-border bg-bg px-5 py-2.5 shrink-0">
            <div className="flex justify-between items-center text-[12px]">
              <span className="text-muted">بهای زنده</span>
              <div className="flex items-center gap-1.5">
                <span className="num text-text font-medium">{fmt(liveCost.costPerPortion)} تومان</span>
                <span className="text-muted">/ پرس</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer nav */}
        <div className="flex gap-2 px-5 py-4 border-t border-border shrink-0">
          {step === 1 ? (
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-[13px] border border-border text-muted min-h-[44px]"
            >
              لغو
            </button>
          ) : (
            <button
              onClick={goPrev}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[13px] border border-border text-muted min-h-[44px]"
            >
              {/* RTL: ArrowRight (→) = رفتن به عقب */}
              <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
              قبلی
            </button>
          )}

          {step < 3 ? (
            <button
              onClick={goNext}
              className="flex-1 bg-text text-surface rounded-lg text-[13px] min-h-[44px] flex items-center justify-center gap-1.5"
            >
              {/* RTL: ArrowLeft (←) = رفتن به جلو */}
              بعدی
              <ArrowLeft size={14} strokeWidth={1.5} aria-hidden="true" />
            </button>
          ) : (
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 bg-text text-surface rounded-lg text-[13px] min-h-[44px] flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              ذخیره رسپی
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
