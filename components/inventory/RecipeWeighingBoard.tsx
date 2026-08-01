'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { Plus, Trash2, Search, Check, Loader2 } from 'lucide-react';
import { createRepos } from '@/lib/repos';
import { estimatedTotalWeightGrams, countWeighedLines } from '@/lib/recipeWeighing';
import type { InventoryItem, InventoryRecipe, InventoryRecipeLine } from '@/types';

const repos = createRepos(null as never);

const UNIT_LABELS: Record<string, string> = {
  kg: 'کیلوگرم', g: 'گرم', L: 'لیتر', ml: 'میلی‌لیتر',
  pcs: 'عدد', can: 'قوطی', pack: 'بسته',
};

const DEFAULT_CATEGORY = 'سایر';

/**
 * فرم رسپی و وزن‌گیری منو — نمای کارتی گروه‌بندی‌شده بر اساس دسته.
 *
 * هر ماده‌ی هر رسپی یک inv_items واقعی است (نه متن آزاد) — این همان چیزی
 * است که بهای تمام‌شده‌ی واقعی (food cost %) را ممکن می‌کند؛ برای همین این
 * فرم به‌جای تایپ آزاد نام ماده، از همان الگوی جستجو-و-انتخاب ویزارد رسپی
 * موجود استفاده می‌کند. category یک فیلد متنی آزاد روی خودِ رسپی است
 * (هم‌سبک inv_items.category) — نه جدول جدا؛ افزودن/حذف/تغییرنام دسته یعنی
 * گروه‌بندی مجدد رسپی‌های همان دسته، نه یک CRUD مستقل.
 */
export function RecipeWeighingBoard({
  recipes,
  items,
  canEdit,
  onReload,
  showToast,
}: {
  recipes: InventoryRecipe[];
  items: InventoryItem[];
  canEdit: boolean;
  onReload: () => Promise<void>;
  showToast: (msg: string, tone: 'success' | 'danger') => void;
}) {
  // دسته‌های خالیِ تازه‌ساخته‌شده که هنوز هیچ رسپی‌ای ندارند — فقط سمت کلاینت،
  // تا اولین رسپی داخلشان ذخیره شود.
  const [draftCategories, setDraftCategories] = useState<string[]>([]);

  const categories = useMemo(() => {
    const set = new Set<string>(draftCategories);
    for (const r of recipes) set.add(r.category || DEFAULT_CATEGORY);
    return [...set].sort((a, b) => a.localeCompare(b, 'fa'));
  }, [recipes, draftCategories]);

  const byCategory = useMemo(() => {
    const map = new Map<string, InventoryRecipe[]>();
    for (const cat of categories) map.set(cat, []);
    for (const r of recipes) {
      const cat = r.category || DEFAULT_CATEGORY;
      (map.get(cat) ?? map.set(cat, []).get(cat)!).push(r);
    }
    return map;
  }, [categories, recipes]);

  const stats = useMemo(() => {
    let weighedDishes = 0;
    for (const r of recipes) {
      if (countWeighedLines(r.lines) > 0) weighedDishes++;
    }
    return { total: recipes.length, weighed: weighedDishes };
  }, [recipes]);

  async function saveRecipePatch(recipe: InventoryRecipe, patch: Partial<InventoryRecipe>) {
    try {
      await repos.inventory.saveRecipe({ ...recipe, ...patch });
      await onReload();
    } catch {
      showToast('ذخیره ناموفق بود', 'danger');
    }
  }

  async function renameCategory(oldName: string, newName: string) {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    setDraftCategories((prev) => prev.map((c) => (c === oldName ? trimmed : c)));
    const affected = byCategory.get(oldName) ?? [];
    for (const r of affected) {
      await saveRecipePatch(r, { category: trimmed });
    }
  }

  async function deleteCategory(name: string) {
    const affected = byCategory.get(name) ?? [];
    if (affected.length > 0) {
      if (!confirm(`دسته «${name}» شامل ${affected.length} غذاست — همه به دسته «${DEFAULT_CATEGORY}» منتقل شوند؟`)) return;
      for (const r of affected) {
        await saveRecipePatch(r, { category: DEFAULT_CATEGORY });
      }
    }
    setDraftCategories((prev) => prev.filter((c) => c !== name));
  }

  function addCategory() {
    let n = 1;
    let name = 'دسته جدید';
    const existing = new Set(categories);
    while (existing.has(name)) { n++; name = `دسته جدید ${n}`; }
    setDraftCategories((prev) => [...prev, name]);
  }

  async function addDish(category: string) {
    try {
      const created = await repos.inventory.saveRecipe({
        id: null,
        name: '',
        branchId: null,
        category,
        portionLabel: '',
        notes: '',
        portions: 1,
        targetFcPct: 30,
        price: 0,
        cookMode: 'daily',
        shelfLifeDays: 1,
        lines: [{ itemId: items[0]?.id ?? '', qtyBase: 0 }],
      });
      if (!created) return;
      setDraftCategories((prev) => prev.filter((c) => c !== category));
      await onReload();
    } catch {
      showToast('افزودن غذا ناموفق بود', 'danger');
    }
  }

  async function deleteDish(r: InventoryRecipe) {
    if (!confirm(`حذف «${r.name || 'این غذا'}»؟`)) return;
    try {
      await repos.inventory.deleteRecipe(r.id!);
      await onReload();
    } catch {
      showToast('حذف ناموفق بود', 'danger');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-[12.5px] text-muted">
        <span><b className="text-text num">{stats.total}</b> غذا</span>
        <span>·</span>
        <span><b className="text-text num">{stats.weighed}</b> وزن‌گیری‌شده</span>
      </div>

      {categories.map((cat, ci) => (
        <CategorySection
          key={cat}
          index={ci + 1}
          name={cat}
          recipes={byCategory.get(cat) ?? []}
          items={items}
          canEdit={canEdit}
          onRename={(newName) => renameCategory(cat, newName)}
          onDelete={() => deleteCategory(cat)}
          onAddDish={() => addDish(cat)}
          onSaveDish={saveRecipePatch}
          onDeleteDish={deleteDish}
        />
      ))}

      {canEdit && (
        <button
          onClick={addCategory}
          className="w-full border-1.5 border-dashed border-border rounded-xl py-2.5 text-[13px] font-medium text-muted hover:border-accent hover:text-accent hover:bg-accent/5 transition-colors flex items-center justify-center gap-1.5"
        >
          <Plus size={15} />
          افزودن دسته جدید
        </button>
      )}
    </div>
  );
}

// ─── CategorySection ────────────────────────────────────────────

function CategorySection({
  index, name, recipes, items, canEdit,
  onRename, onDelete, onAddDish, onSaveDish, onDeleteDish,
}: {
  index: number;
  name: string;
  recipes: InventoryRecipe[];
  items: InventoryItem[];
  canEdit: boolean;
  onRename: (newName: string) => void;
  onDelete: () => void;
  onAddDish: () => void;
  onSaveDish: (r: InventoryRecipe, patch: Partial<InventoryRecipe>) => Promise<void>;
  onDeleteDish: (r: InventoryRecipe) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[11px] font-bold text-accent bg-accent/10 px-2.5 py-0.5 rounded-full shrink-0">
          {index}
        </span>
        {canEdit ? (
          <input
            defaultValue={name}
            onBlur={(e) => onRename(e.target.value)}
            className="flex-1 min-w-0 text-[18px] font-bold text-text bg-transparent border-none focus:outline-none focus:bg-bg rounded px-1 py-0.5"
            placeholder="نام دسته"
          />
        ) : (
          <h3 className="flex-1 min-w-0 text-[18px] font-bold text-text">{name}</h3>
        )}
        {canEdit && (
          <button
            onClick={onDelete}
            className="w-8 h-8 flex items-center justify-center text-muted hover:text-danger rounded-lg shrink-0"
            title="حذف دسته"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      <div className="space-y-3">
        {recipes.map((r) => (
          <DishCard
            key={r.id}
            recipe={r}
            items={items}
            canEdit={canEdit}
            onSave={(patch) => onSaveDish(r, patch)}
            onDelete={() => onDeleteDish(r)}
          />
        ))}
      </div>

      {canEdit && (
        <button
          onClick={onAddDish}
          className="w-full mt-2 border-1.5 border-dashed border-border rounded-xl py-2.5 text-[13px] font-medium text-muted hover:border-accent hover:text-accent hover:bg-accent/5 transition-colors flex items-center justify-center gap-1.5"
        >
          <Plus size={15} />
          افزودن غذا به این دسته
        </button>
      )}
    </div>
  );
}

// ─── DishCard ───────────────────────────────────────────────────

function DishCard({
  recipe, items, canEdit, onSave, onDelete,
}: {
  recipe: InventoryRecipe;
  items: InventoryItem[];
  canEdit: boolean;
  onSave: (patch: Partial<InventoryRecipe>) => Promise<void>;
  onDelete: () => void;
}) {
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const selectedIds = useMemo(() => new Set(recipe.lines.map((l) => l.itemId)), [recipe.lines]);

  const filteredItems = useMemo(() => {
    const q = search.trim();
    if (!q) return [];
    return items.filter((i) => i.name.includes(q)).slice(0, 8);
  }, [search, items]);

  const totalWeightGrams = useMemo(() => {
    const lines = recipe.lines
      .map((l) => ({ qtyBase: l.qtyBase, itemUnit: itemById.get(l.itemId)?.unit }))
      .filter((l): l is { qtyBase: number; itemUnit: NonNullable<typeof l.itemUnit> } => !!l.itemUnit);
    return estimatedTotalWeightGrams(lines);
  }, [recipe.lines, itemById]);

  function debouncedSave(patch: Partial<InventoryRecipe>) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaving(true);
    saveTimer.current = setTimeout(async () => {
      await onSave(patch);
      setSaving(false);
    }, 500);
  }

  function updateLine(itemId: string, qtyBase: number) {
    const lines = recipe.lines.map((l) => (l.itemId === itemId ? { ...l, qtyBase } : l));
    debouncedSave({ lines });
  }

  function addLine(itemId: string) {
    if (selectedIds.has(itemId)) return;
    const lines: InventoryRecipeLine[] = [...recipe.lines, { itemId, qtyBase: 0 }];
    setSearch('');
    void onSave({ lines });
  }

  function removeLine(itemId: string) {
    const lines = recipe.lines.filter((l) => l.itemId !== itemId);
    if (lines.length === 0) return; // حداقل یک ماده لازم است (قرارداد API)
    void onSave({ lines });
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        {canEdit ? (
          <input
            defaultValue={recipe.name}
            onBlur={(e) => onSave({ name: e.target.value })}
            placeholder="نام غذا"
            className="flex-1 min-w-0 text-[15px] font-semibold text-text bg-transparent border-b-2 border-transparent focus:outline-none focus:border-accent py-0.5"
          />
        ) : (
          <span className="flex-1 min-w-0 text-[15px] font-semibold text-text">{recipe.name || '—'}</span>
        )}
        {saving && <Loader2 size={13} className="animate-spin text-muted shrink-0" />}
        {canEdit && (
          <button
            onClick={onDelete}
            className="w-8 h-8 flex items-center justify-center text-muted hover:text-danger rounded-lg shrink-0"
            title="حذف غذا"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {canEdit ? (
        <input
          defaultValue={recipe.portionLabel ?? ''}
          onBlur={(e) => onSave({ portionLabel: e.target.value })}
          placeholder="اندازه/پرس — مثلاً پتی ۱۶۰ گرمی، بشقاب ۲۵ سانتی"
          className="w-full mb-3 border border-border rounded-lg px-3 py-1.5 text-[12.5px] bg-bg text-text focus:outline-none focus:ring-1 focus:ring-accent"
        />
      ) : recipe.portionLabel ? (
        <p className="text-[12px] text-muted mb-3">اندازه/پرس: {recipe.portionLabel}</p>
      ) : null}

      {/* جدول مواد */}
      <div className="space-y-1.5 mb-2">
        {recipe.lines.map((line) => {
          const item = itemById.get(line.itemId);
          return (
            <div key={line.itemId} className="flex items-center gap-2">
              <span className="flex-1 min-w-0 text-[12.5px] text-text truncate">
                {item?.name ?? '— حذف‌شده —'}
              </span>
              {canEdit ? (
                <input
                  type="text"
                  inputMode="decimal"
                  dir="ltr"
                  defaultValue={line.qtyBase === 0 ? '' : String(line.qtyBase)}
                  onChange={(e) => {
                    const n = parseFloat(e.target.value.replace(/[^0-9.]/g, ''));
                    updateLine(line.itemId, isNaN(n) ? 0 : n);
                  }}
                  placeholder="مقدار"
                  className="w-20 h-8 border border-border rounded-md px-2 text-[12.5px] text-center focus:outline-none focus:ring-1 focus:ring-accent bg-bg text-text shrink-0"
                />
              ) : (
                <span className="w-20 text-[12.5px] text-center text-text num shrink-0">
                  {line.qtyBase || '—'}
                </span>
              )}
              <span className="text-[11px] text-muted w-14 text-center shrink-0">
                {item ? UNIT_LABELS[item.unit] ?? item.unit : ''}
              </span>
              {canEdit && (
                <button
                  onClick={() => removeLine(line.itemId)}
                  className="w-7 h-7 flex items-center justify-center text-muted hover:text-danger rounded-md shrink-0"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {canEdit && (
        <div className="relative mb-3">
          <Search size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="افزودن ماده..."
            className="w-full border border-border rounded-lg pr-8 pl-2.5 py-1.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-accent bg-surface text-text"
          />
          {filteredItems.length > 0 && (
            <div className="absolute z-10 mt-1 w-full border border-border rounded-lg bg-surface shadow-lg divide-y divide-border overflow-hidden max-h-48 overflow-y-auto">
              {filteredItems.map((it) => {
                const already = selectedIds.has(it.id);
                return (
                  <button
                    key={it.id}
                    onClick={() => addLine(it.id)}
                    disabled={already}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 text-[12px] text-right ${already ? 'opacity-40' : 'hover:bg-bg'}`}
                  >
                    <span className="text-text">{it.name}</span>
                    {already ? <Check size={12} className="text-ok" /> : <Plus size={12} className="text-muted" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 text-[12px] text-muted mb-2">
        <span>وزن کل تخمینی: <b className="text-text num">{Math.round(totalWeightGrams)}</b> گرم</span>
      </div>

      {canEdit ? (
        <textarea
          defaultValue={recipe.notes ?? ''}
          onBlur={(e) => onSave({ notes: e.target.value })}
          rows={2}
          placeholder="رسپی و توضیحات — روش آماده‌سازی، نکات پلیت‌گذاری، دمای پخت، ..."
          className="w-full border border-border rounded-lg px-3 py-2 text-[12.5px] leading-6 bg-bg text-text focus:outline-none focus:ring-1 focus:ring-accent resize-y"
        />
      ) : recipe.notes ? (
        <p className="text-[12px] text-muted whitespace-pre-wrap leading-6">{recipe.notes}</p>
      ) : null}
    </div>
  );
}
