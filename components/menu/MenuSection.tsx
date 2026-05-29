'use client';

import { useLanguage } from '@/lib/menu/i18n';
import type { MenuSection as MenuSectionType } from '@/types';
import { MenuItem } from './MenuItem';

export function MenuSection({ section }: { section: MenuSectionType }) {
  const { pick } = useLanguage();
  const label = pick(section.labelEn, section.labelFa);
  const eyebrow = pick('— Menu', '— منو');

  const visibleItems = section.items.filter((i) => i.isAvailable);
  if (visibleItems.length === 0) return null;

  return (
    <section className="mt-16 first:mt-0 sm:mt-20">
      <header className="mb-2">
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{eyebrow}</p>
        <h2 className="mt-2 text-3xl leading-tight text-foreground sm:text-4xl">{label}</h2>
      </header>
      <div className="mt-6 border-t border-border">
        <ul className="divide-y divide-border">
          {visibleItems.map((item) => <MenuItem key={item.id} item={item} />)}
        </ul>
      </div>
    </section>
  );
}
