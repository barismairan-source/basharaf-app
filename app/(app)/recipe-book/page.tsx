'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Plus, Trash2, Edit3, X, Check, ExternalLink } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, Field, Input, Select, Textarea, Empty, Chip, Switch } from '@/components/ui';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import type { Recipe, RecipeInput, RecipeProtein } from '@/types';

const PROTEIN_LABEL: Record<RecipeProtein, string> = {
  chicken: 'مرغ', red_meat: 'گوشت قرمز', seafood: 'دریایی', vegetarian: 'گیاهی', vegan: 'وگان', other: 'سایر',
};
const PROTEIN_OPTIONS = Object.keys(PROTEIN_LABEL) as RecipeProtein[];

type Tab = 'recipes' | 'categories';

export default function RecipeBookAdminPage() {
  const user = useAppStore(s => s.user);
  const recipes = useAppStore(s => s.recipes);
  const categories = useAppStore(s => s.recipeCategories);
  const ingredientTags = useAppStore(s => s.ingredientTags);
  const loadRecipeBook = useAppStore(s => s.loadRecipeBook);
  const createRecipe = useAppStore(s => s.createRecipe);
  const updateRecipe = useAppStore(s => s.updateRecipe);
  const deleteRecipe = useAppStore(s => s.deleteRecipe);
  const createRecipeCategory = useAppStore(s => s.createRecipeCategory);
  const deleteRecipeCategory = useAppStore(s => s.deleteRecipeCategory);
  const getOrCreateIngredientTag = useAppStore(s => s.getOrCreateIngredientTag);
  const showToast = useAppStore(s => s.showToast);

  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<Tab>('recipes');

  useEffect(() => { setHydrated(true); loadRecipeBook(); }, [loadRecipeBook]);

  if (!hydrated || !user) return null;
  if (user.role !== 'SuperAdmin' && user.role !== 'Chef') {
    return <div className="p-6"><Card><CardBody><Empty title="فقط مدیر کل و سرآشپز به این بخش دسترسی دارند" icon={BookOpen} /></CardBody></Card></div>;
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-medium text-stone-900 tracking-tight">رسپی‌بوک</h1>
            <div className="text-[12px] text-stone-500 mt-1">رسپی‌های ویدیویی صفاسیتی</div>
          </div>
          <a href="/safasity/recipes" target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 h-9 px-3 rounded-md border border-stone-200 text-[12px] text-stone-600 hover:bg-stone-50">
            <ExternalLink size={13} strokeWidth={1.5} />
            <span className="hidden sm:inline">مشاهده صفحه</span>
          </a>
        </div>

        <div className="flex gap-1 border-b border-stone-200">
          {([['recipes', 'رسپی‌ها'], ['categories', 'دسته‌ها']] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('px-4 h-10 text-[13px] border-b-2 -mb-px transition-colors',
                tab === t ? 'border-stone-900 text-stone-900' : 'border-transparent text-stone-500 hover:text-stone-800')}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'recipes' && (
          <RecipesTab
            recipes={recipes} categories={categories} ingredientTags={ingredientTags}
            onCreate={createRecipe} onUpdate={updateRecipe} onDelete={deleteRecipe}
            onGetOrCreateTag={getOrCreateIngredientTag} showToast={showToast}
          />
        )}
        {tab === 'categories' && (
          <CategoriesTab categories={categories} recipes={recipes} onCreate={createRecipeCategory} onDelete={deleteRecipeCategory} showToast={showToast} />
        )}
      </div>
    </div>
  );
}

// ─── Recipes Tab ─────────────────────────────────────────────────
interface IngredientRow { ingredientTagId: string; name: string; quantityLabel: string; sortOrder: number }

interface RecipeFormState {
  slug: string; title: string; summary: string; categoryId: string; protein: RecipeProtein;
  prepTimeMinutes: string; servings: string; steps: string[];
  instagramUrl: string; videoUrl: string; imageUrl: string; isPublished: boolean;
  ingredients: IngredientRow[];
}

const EMPTY_FORM: RecipeFormState = {
  slug: '', title: '', summary: '', categoryId: '', protein: 'other',
  prepTimeMinutes: '', servings: '', steps: [''],
  instagramUrl: '', videoUrl: '', imageUrl: '', isPublished: true,
  ingredients: [],
};

function recipeToForm(r: Recipe): RecipeFormState {
  return {
    slug: r.slug, title: r.title, summary: r.summary, categoryId: r.category?.id ?? '', protein: r.protein,
    prepTimeMinutes: r.prepTimeMinutes?.toString() ?? '', servings: r.servings ?? '',
    steps: r.steps.length > 0 ? r.steps : [''],
    instagramUrl: r.instagramUrl ?? '', videoUrl: r.videoUrl ?? '', imageUrl: r.imageUrl ?? '', isPublished: r.isPublished,
    ingredients: r.ingredients.map(i => ({ ingredientTagId: i.ingredientTagId, name: i.name, quantityLabel: i.quantityLabel, sortOrder: i.sortOrder })),
  };
}

function formToInput(f: RecipeFormState): RecipeInput {
  return {
    slug: f.slug.trim(), title: f.title.trim(), summary: f.summary.trim(),
    categoryId: f.categoryId || null, protein: f.protein,
    prepTimeMinutes: f.prepTimeMinutes ? Number(f.prepTimeMinutes) : null,
    servings: f.servings.trim() || null,
    steps: f.steps.map(s => s.trim()).filter(Boolean),
    instagramUrl: f.instagramUrl.trim() || null, videoUrl: f.videoUrl.trim() || null, imageUrl: f.imageUrl.trim() || null,
    isPublished: f.isPublished,
    ingredients: f.ingredients.map((ing, i) => ({ ingredientTagId: ing.ingredientTagId, quantityLabel: ing.quantityLabel, sortOrder: i })),
  };
}

function RecipesTab({ recipes, categories, ingredientTags, onCreate, onUpdate, onDelete, onGetOrCreateTag, showToast }: any) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<RecipeFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [newIngredientName, setNewIngredientName] = useState('');
  const [newIngredientQty, setNewIngredientQty] = useState('');

  const sorted = useMemo(() => [...recipes].sort((a: Recipe, b: Recipe) => a.sortOrder - b.sortOrder), [recipes]);

  function startCreate() { setForm(EMPTY_FORM); setCreating(true); setEditingId(null); }
  function startEdit(r: Recipe) { setForm(recipeToForm(r)); setEditingId(r.id); setCreating(false); }
  function cancel() { setCreating(false); setEditingId(null); setForm(EMPTY_FORM); setNewIngredientName(''); setNewIngredientQty(''); }

  async function addIngredient() {
    const name = newIngredientName.trim();
    if (!name) return;
    const tag = await onGetOrCreateTag(name);
    if (!tag) { showToast('خطا در افزودن ماده اولیه', 'danger'); return; }
    if (form.ingredients.some(i => i.ingredientTagId === tag.id)) { showToast('این ماده قبلاً اضافه شده', 'danger'); return; }
    setForm(f => ({ ...f, ingredients: [...f.ingredients, { ingredientTagId: tag.id, name: tag.name, quantityLabel: newIngredientQty.trim(), sortOrder: f.ingredients.length }] }));
    setNewIngredientName(''); setNewIngredientQty('');
  }

  function removeIngredient(tagId: string) {
    setForm(f => ({ ...f, ingredients: f.ingredients.filter(i => i.ingredientTagId !== tagId) }));
  }

  function updateStep(idx: number, value: string) {
    setForm(f => ({ ...f, steps: f.steps.map((s, i) => (i === idx ? value : s)) }));
  }
  function addStep() { setForm(f => ({ ...f, steps: [...f.steps, ''] })); }
  function removeStep(idx: number) { setForm(f => ({ ...f, steps: f.steps.filter((_, i) => i !== idx) })); }

  async function handleSave() {
    if (!form.slug.trim() || !form.title.trim()) { showToast('اسلاگ و عنوان را وارد کنید', 'danger'); return; }
    setSaving(true);
    const input = formToInput(form);
    const ok = editingId ? await onUpdate(editingId, input) : await onCreate(input);
    setSaving(false);
    if (ok) { showToast(editingId ? 'رسپی به‌روزرسانی شد' : 'رسپی اضافه شد', 'success'); cancel(); }
    else showToast('خطا — شاید اسلاگ تکراری است', 'danger');
  }

  async function handleDelete(id: string) {
    if (!confirm('این رسپی حذف شود؟')) return;
    const ok = await onDelete(id);
    showToast(ok ? 'رسپی حذف شد' : 'خطا در حذف', ok ? 'success' : 'danger');
  }

  const isFormOpen = creating || editingId !== null;

  return (
    <div className="space-y-4">
      {isFormOpen ? (
        <Card>
          <CardHeader title={editingId ? 'ویرایش رسپی' : 'رسپی جدید'} />
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <Field label="عنوان"><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></Field>
              <Field label="اسلاگ (برای لینک)" helper={`basharaf.me/safasity/recipes/${form.slug || '...'}`}>
                <Input dir="ltr" placeholder="burger-blue-cheese" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase() })} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="توضیح کوتاه"><Textarea rows={2} value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} /></Field>
              </div>
              <Field label="دسته">
                <Select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
                  <option value="">بدون دسته</option>
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </Select>
              </Field>
              <Field label="پروتئین">
                <Select value={form.protein} onChange={e => setForm({ ...form, protein: e.target.value as RecipeProtein })}>
                  {PROTEIN_OPTIONS.map(p => <option key={p} value={p}>{PROTEIN_LABEL[p]}</option>)}
                </Select>
              </Field>
              <Field label="زمان پخت (دقیقه)"><Input dir="ltr" value={form.prepTimeMinutes} onChange={e => setForm({ ...form, prepTimeMinutes: e.target.value.replace(/\D/g, '') })} /></Field>
              <Field label="تعداد نفر"><Input value={form.servings} onChange={e => setForm({ ...form, servings: e.target.value })} /></Field>
              <Field label="لینک اینستاگرام (اختیاری)"><Input dir="ltr" value={form.instagramUrl} onChange={e => setForm({ ...form, instagramUrl: e.target.value })} /></Field>
              <Field label="لینک ویدیو (اختیاری)"><Input dir="ltr" value={form.videoUrl} onChange={e => setForm({ ...form, videoUrl: e.target.value })} /></Field>
              <Field label="لینک عکس (اختیاری)"><Input dir="ltr" value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} /></Field>
              <div className="flex items-center justify-between rounded-md border border-stone-200 px-3 h-10">
                <span className="text-[12px] text-stone-600">منتشر شده (روی سایت دیده شود)</span>
                <Switch checked={form.isPublished} onCheckedChange={v => setForm({ ...form, isPublished: v })} aria-label="منتشر شده" />
              </div>
            </div>

            <div>
              <p className="text-[12px] font-medium text-stone-700 mb-2">مواد لازم</p>
              <div className="space-y-1.5">
                {form.ingredients.map(ing => (
                  <div key={ing.ingredientTagId} className="flex items-center gap-2 rounded-md border border-stone-200 px-2.5 py-1.5">
                    <span className="flex-1 text-[12px] text-stone-700">{ing.name}</span>
                    <span className="text-[11px] text-stone-400">{ing.quantityLabel}</span>
                    <button onClick={() => removeIngredient(ing.ingredientTagId)} className="text-stone-400 hover:text-red-500"><X size={13} /></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <input list="ingredient-tag-options" placeholder="نام ماده (مثلاً پیاز)" value={newIngredientName}
                  onChange={e => setNewIngredientName(e.target.value)}
                  className="flex-1 h-9 rounded-md border border-stone-200 px-2.5 text-[12px] focus:outline-none focus:border-stone-400" />
                <datalist id="ingredient-tag-options">
                  {ingredientTags.map((t: any) => <option key={t.id} value={t.name} />)}
                </datalist>
                <input placeholder="مقدار (مثلاً ۲۰۰ گرم)" value={newIngredientQty} onChange={e => setNewIngredientQty(e.target.value)}
                  className="w-40 h-9 rounded-md border border-stone-200 px-2.5 text-[12px] focus:outline-none focus:border-stone-400" />
                <Button variant="default" size="sm" icon={Plus} onClick={addIngredient}>افزودن</Button>
              </div>
            </div>

            <div>
              <p className="text-[12px] font-medium text-stone-700 mb-2">طرز تهیه (مرحله‌به‌مرحله)</p>
              <div className="space-y-2">
                {form.steps.map((step, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="flex-shrink-0 w-6 h-9 flex items-center justify-center text-[11px] text-stone-400">{i + 1}</span>
                    <Textarea rows={1} value={step} onChange={e => updateStep(i, e.target.value)} className="flex-1" />
                    <button onClick={() => removeStep(i)} className="flex-shrink-0 w-9 h-9 flex items-center justify-center text-stone-400 hover:text-red-500"><X size={14} /></button>
                  </div>
                ))}
              </div>
              <button onClick={addStep} className="mt-2 flex items-center gap-1.5 text-[12px] text-stone-500 hover:text-stone-800">
                <Plus size={13} /> افزودن مرحله
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button variant="default" icon={X} onClick={cancel}>انصراف</Button>
              <Button variant="primary" icon={Check} loading={saving} onClick={handleSave}>ذخیره</Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <button onClick={startCreate}
          className="w-full flex items-center justify-center gap-1.5 h-11 rounded-lg border border-dashed border-stone-300 text-[13px] text-stone-500 hover:bg-stone-50">
          <Plus size={15} strokeWidth={1.5} /> رسپی جدید
        </button>
      )}

      <div className="space-y-2">
        {sorted.length === 0 && <Empty title="هنوز رسپی‌ای اضافه نشده" icon={BookOpen} />}
        {sorted.map((r: Recipe) => (
          <Card key={r.id}>
            <CardBody className="flex items-center gap-3 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-medium text-stone-800">{r.title}</span>
                  {r.category && <Chip>{r.category.label}</Chip>}
                  <Chip>{PROTEIN_LABEL[r.protein]}</Chip>
                  {!r.isPublished && <Chip tone="amber">پیش‌نویس</Chip>}
                </div>
                <span className="text-[11px] text-stone-400" dir="ltr">/safasity/recipes/{r.slug}</span>
              </div>
              <button onClick={() => startEdit(r)} className="w-8 h-8 flex items-center justify-center rounded hover:bg-stone-100 flex-shrink-0"><Edit3 size={14} strokeWidth={1.5} /></button>
              <button onClick={() => handleDelete(r.id)} className="w-8 h-8 flex items-center justify-center rounded hover:bg-red-50 text-red-500 flex-shrink-0"><Trash2 size={14} strokeWidth={1.5} /></button>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Categories Tab ──────────────────────────────────────────────
function CategoriesTab({ categories, recipes, onCreate, onDelete, showToast }: any) {
  const [label, setLabel] = useState('');
  const [slug, setSlug] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!label.trim() || !slug.trim()) { showToast('عنوان و اسلاگ را وارد کنید', 'danger'); return; }
    setSaving(true);
    const ok = await onCreate({ slug: slug.trim().toLowerCase(), label: label.trim(), sortOrder: categories.length });
    setSaving(false);
    if (ok) { setLabel(''); setSlug(''); showToast('دسته اضافه شد', 'success'); }
    else showToast('خطا — شاید اسلاگ تکراری است', 'danger');
  }

  async function handleDelete(id: string) {
    const res = await onDelete(id);
    showToast(res.ok ? 'دسته حذف شد' : res.error, res.ok ? 'success' : 'danger');
  }

  return (
    <Card>
      <CardHeader title="دسته‌های رسپی" sub="مثلاً برگر، پاستا، دسر، سوپ" />
      <CardBody className="space-y-3">
        {categories.length === 0 && <Empty title="هنوز دسته‌ای اضافه نشده" />}
        {categories.map((c: any) => {
          const count = recipes.filter((r: Recipe) => r.category?.id === c.id).length;
          return (
            <div key={c.id} className="flex items-center gap-3 rounded-md border border-stone-200 px-3 h-11">
              <span className="flex-1 text-[13px] text-stone-800">{c.label}</span>
              <span className="text-[11px] text-stone-400">{count} رسپی</span>
              <button onClick={() => handleDelete(c.id)} className="text-stone-400 hover:text-red-500"><Trash2 size={14} strokeWidth={1.5} /></button>
            </div>
          );
        })}
        <div className="flex gap-2 pt-2 border-t border-border">
          <Input placeholder="عنوان (پاستا)" value={label} onChange={e => setLabel(e.target.value)} />
          <Input dir="ltr" placeholder="pasta" value={slug} onChange={e => setSlug(e.target.value.toLowerCase())} />
          <Button variant="primary" size="sm" icon={Plus} loading={saving} onClick={handleAdd}>افزودن</Button>
        </div>
      </CardBody>
    </Card>
  );
}
