'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChefHat, Clock, Users, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Recipe, RecipeCategory, IngredientTag, RecipeProtein } from '@/types';

const PROTEIN_LABEL: Record<RecipeProtein, string> = {
  chicken: 'مرغ', red_meat: 'گوشت قرمز', seafood: 'دریایی', vegetarian: 'گیاهی', vegan: 'وگان', other: 'سایر',
};
const PROTEIN_OPTIONS = Object.keys(PROTEIN_LABEL) as RecipeProtein[];
const ACCENTS = ['amber', 'rose', 'violet', 'emerald', 'sky'] as const;
const ACCENT_BG: Record<string, string> = {
  amber: 'bg-gradient-to-br from-amber-200 to-amber-400',
  rose: 'bg-gradient-to-br from-rose-200 to-rose-400',
  violet: 'bg-gradient-to-br from-violet-200 to-violet-400',
  emerald: 'bg-gradient-to-br from-emerald-200 to-emerald-400',
  sky: 'bg-gradient-to-br from-sky-200 to-sky-400',
};

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<RecipeCategory[]>([]);
  const [allTags, setAllTags] = useState<IngredientTag[]>([]);
  const [loading, setLoading] = useState(true);

  const [categorySlug, setCategorySlug] = useState<string | null>(null);
  const [protein, setProtein] = useState<RecipeProtein | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tagQuery, setTagQuery] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/recipe-categories', { cache: 'no-store' }).then(r => r.json()),
      fetch('/api/ingredient-tags', { cache: 'no-store' }).then(r => r.json()),
    ]).then(([c, t]) => { setCategories(c.categories ?? []); setAllTags(t.tags ?? []); });
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (categorySlug) params.set('category', categorySlug);
    if (protein) params.set('protein', protein);
    if (selectedTagIds.length > 0) params.set('ingredients', selectedTagIds.join(','));
    fetch(`/api/recipes?${params.toString()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setRecipes(d.recipes ?? []))
      .finally(() => setLoading(false));
  }, [categorySlug, protein, selectedTagIds]);

  const filteredTagOptions = useMemo(
    () => allTags.filter(t => t.name.includes(tagQuery.trim())).slice(0, 30),
    [allTags, tagQuery],
  );

  function toggleTag(id: string) {
    setSelectedTagIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  }

  const hasActiveFilters = categorySlug || protein || selectedTagIds.length > 0;

  return (
    <div className="mx-auto max-w-md px-6 pb-20 pt-14 sm:pt-16">
      <header className="text-center">
        <h1 className="text-2xl font-semibold text-foreground">رسپی‌بوک صفاسیتی</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          همان غذاهایی که در ریلزهامون می‌بینید، این‌بار قدم‌به‌قدم برای پختن در خانه‌ی شما.
        </p>
      </header>

      {/* ابزار «با چی که دارم چی بپزم؟» */}
      <div className="mt-7 rounded-2xl border border-border bg-white shadow-sm">
        <button onClick={() => setPickerOpen(o => !o)} className="flex w-full items-center gap-2.5 px-4 py-3.5 text-right">
          <Search size={16} strokeWidth={1.5} className="flex-shrink-0 text-amber-600" />
          <span className="flex-1 text-[13px] font-medium text-foreground">با چی که دارم چی بپزم؟</span>
          {selectedTagIds.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">{selectedTagIds.length}</span>
          )}
        </button>
        {pickerOpen && (
          <div className="border-t border-border p-4">
            <input
              value={tagQuery}
              onChange={e => setTagQuery(e.target.value)}
              placeholder="مثلاً مرغ، قارچ، پیاز..."
              className="w-full rounded-lg border border-border px-3 py-2 text-[13px] focus:outline-none focus:border-stone-400"
            />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {filteredTagOptions.map(t => (
                <button key={t.id} onClick={() => toggleTag(t.id)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[12px] transition-colors',
                    selectedTagIds.includes(t.id) ? 'border-stone-900 bg-stone-900 text-white' : 'border-border text-muted-foreground hover:border-stone-400',
                  )}>
                  {t.name}
                </button>
              ))}
              {filteredTagOptions.length === 0 && <span className="text-[12px] text-muted-foreground">چیزی پیدا نشد</span>}
            </div>
          </div>
        )}
      </div>

      {/* فیلتر دسته و پروتئین */}
      <div className="mt-4 space-y-2.5">
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={categorySlug === null} onClick={() => setCategorySlug(null)}>همه‌ی دسته‌ها</FilterChip>
          {categories.map(c => (
            <FilterChip key={c.id} active={categorySlug === c.slug} onClick={() => setCategorySlug(c.slug)}>{c.label}</FilterChip>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={protein === null} onClick={() => setProtein(null)}>همه‌ی پروتئین‌ها</FilterChip>
          {PROTEIN_OPTIONS.map(p => (
            <FilterChip key={p} active={protein === p} onClick={() => setProtein(p)}>{PROTEIN_LABEL[p]}</FilterChip>
          ))}
        </div>
        {hasActiveFilters && (
          <button onClick={() => { setCategorySlug(null); setProtein(null); setSelectedTagIds([]); }}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
            <X size={12} strokeWidth={1.5} /> پاک‌کردن فیلترها
          </button>
        )}
      </div>

      {/* لیست رسپی‌ها */}
      <div className="mt-6 space-y-4">
        {loading && [0, 1].map(i => <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />)}
        {!loading && recipes.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">رسپی‌ای با این فیلترها پیدا نشد.</p>
        )}
        {!loading && recipes.map((r, i) => (
          <Link
            key={r.id}
            href={`/safasity/recipes/${r.slug}`}
            className="flex gap-4 overflow-hidden rounded-2xl border border-border bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className={`flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-xl ${ACCENT_BG[ACCENTS[i % ACCENTS.length]!]}`}>
              <ChefHat size={30} strokeWidth={1.5} className="text-white/90" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
              {r.category && <span className="w-fit rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600">{r.category.label}</span>}
              <h2 className="text-[15px] font-medium leading-snug text-foreground">{r.title}</h2>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                {r.prepTimeMinutes && <span className="flex items-center gap-1"><Clock size={12} strokeWidth={1.5} /> {r.prepTimeMinutes} دقیقه</span>}
                {r.servings && <span className="flex items-center gap-1"><Users size={12} strokeWidth={1.5} /> {r.servings}</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1.5 text-[12px] transition-colors',
        active ? 'border-stone-900 bg-stone-900 text-white' : 'border-border bg-white text-muted-foreground hover:border-stone-400',
      )}>
      {children}
    </button>
  );
}
