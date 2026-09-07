'use client';

import { useLanguage } from '@/lib/menu/i18n';
import type { MenuSection as MenuSectionType } from '@/types';
import { MenuItem } from './MenuItem';

export function MenuSection({ section }: { section: MenuSectionType }) {
  const { pick } = useLanguage();
  const label = pick(section.labelEn, section.labelFa);

  const visibleItems = section.items.filter((i) => i.isAvailable);
  if (visibleItems.length === 0) return null;

  return (
    <section id={section.slug} className="mt-14 scroll-mt-6 first:mt-0 sm:mt-16">
      <header className="mb-7 text-center sm:mb-9">
        <h2 className="text-[28px] leading-tight text-foreground sm:text-[34px]">{label}</h2>
      </header>
      <ul className="grid grid-cols-1 gap-x-10 gap-y-7 sm:grid-cols-2">
        {visibleItems.map((item) => <MenuItem key={item.id} item={item} />)}
      </ul>
    </section>
  );
}
