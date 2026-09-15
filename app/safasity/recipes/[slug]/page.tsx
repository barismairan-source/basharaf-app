'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChefHat, Clock, Users, Instagram } from 'lucide-react';
import type { Recipe, RecipeProtein } from '@/types';

const PROTEIN_LABEL: Record<RecipeProtein, string> = {
  chicken: 'مرغ', red_meat: 'گوشت قرمز', seafood: 'دریایی', vegetarian: 'گیاهی', vegan: 'وگان', other: 'سایر',
};

export default function RecipeDetailPage({ params }: { params: { slug: string } }) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/recipes/by-slug/${params.slug}`, { cache: 'no-store' })
      .then(r => { if (!r.ok) throw new Error('not-found'); return r.json(); })
      .then(d => setRecipe(d.recipe))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-md px-6 pb-20 pt-8">
        <div className="h-44 animate-pulse rounded-2xl bg-muted" />
        <div className="mt-5 h-6 w-2/3 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (notFound || !recipe) {
    return (
      <div className="mx-auto max-w-md px-6 pb-20 pt-16 text-center">
        <p className="text-sm text-muted-foreground">این رسپی پیدا نشد.</p>
        <Link href="/safasity/recipes" className="mt-4 inline-block text-[13px] text-foreground underline underline-offset-2">
          بازگشت به رسپی‌بوک
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 pb-20 pt-8">
      <Link href="/safasity/recipes" className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground">
        <ArrowRight size={14} strokeWidth={1.5} /> رسپی‌بوک
      </Link>

      <div className="mt-4 flex h-44 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-200 to-amber-400">
        <ChefHat size={48} strokeWidth={1.2} className="text-white/90" />
      </div>

      {recipe.category && (
        <span className="mt-5 inline-block rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-700">
          {recipe.category.label}
        </span>
      )}
      <h1 className="mt-2 text-xl font-semibold leading-snug text-foreground">{recipe.title}</h1>
      {recipe.summary && <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground">{recipe.summary}</p>}

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-muted-foreground">
        {recipe.prepTimeMinutes && <span className="flex items-center gap-1.5"><Clock size={14} strokeWidth={1.5} /> {recipe.prepTimeMinutes} دقیقه</span>}
        {recipe.servings && <span className="flex items-center gap-1.5"><Users size={14} strokeWidth={1.5} /> {recipe.servings}</span>}
        <span className="rounded-full bg-stone-100 px-2 py-0.5">{PROTEIN_LABEL[recipe.protein]}</span>
      </div>

      {recipe.ingredients.length > 0 && (
        <section className="mt-8 rounded-2xl border border-border bg-white p-5 shadow-sm">
          <h2 className="text-[14px] font-medium text-foreground">مواد لازم</h2>
          <ul className="mt-3 space-y-2">
            {recipe.ingredients.map(ing => (
              <li key={ing.id} className="flex items-center justify-between gap-2.5 text-[13px] leading-relaxed text-foreground">
                <span className="flex items-center gap-2.5">
                  <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-muted-foreground" />
                  {ing.name}
                </span>
                {ing.quantityLabel && <span className="text-muted-foreground">{ing.quantityLabel}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {recipe.steps.length > 0 && (
        <section className="mt-4 rounded-2xl border border-border bg-white p-5 shadow-sm">
          <h2 className="text-[14px] font-medium text-foreground">طرز تهیه</h2>
          <ol className="mt-3 space-y-4">
            {recipe.steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-stone-900 text-[11px] font-semibold text-white">
                  {i + 1}
                </span>
                <p className="flex-1 pt-0.5 text-[13px] leading-relaxed text-foreground">{step}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {recipe.instagramUrl && (
        <a
          href={recipe.instagramUrl}
          target="_blank" rel="noreferrer"
          className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-border bg-white py-3.5 text-[13px] text-muted-foreground shadow-sm hover:text-foreground hover:bg-muted"
        >
          <Instagram size={15} strokeWidth={1.5} /> دیدن ویدیوی این رسپی در اینستاگرام
        </a>
      )}
    </div>
  );
}
