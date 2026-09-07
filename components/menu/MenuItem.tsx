'use client';

import { useLanguage } from '@/lib/menu/i18n';
import type { MenuItem as MenuItemType } from '@/types';

export function MenuItem({ item }: { item: MenuItemType }) {
  const { pick, formatPrice } = useLanguage();

  const title = pick(item.titleEn, item.titleFa);
  const description = pick(item.descriptionEn, item.descriptionFa);
  const unavailableLabel = pick('unavailable', 'موجود نیست');
  const sold = !item.isAvailable;

  return (
    <li className={['transition-opacity duration-200', sold ? 'opacity-50' : 'opacity-100'].join(' ')}>
      <div className="flex items-baseline gap-2.5">
        <h3 className="flex-1 text-base font-medium leading-snug text-foreground sm:text-[17px]">
          <span className={sold ? 'line-through decoration-1' : undefined}>{title}</span>
        </h3>
        {item.price !== null && (
          <span className={['flex-shrink-0 text-sm tabular-nums text-foreground sm:text-base', sold ? 'line-through decoration-1' : undefined].filter(Boolean).join(' ')}>
            {formatPrice(item.price)}
          </span>
        )}
      </div>
      {sold && <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{unavailableLabel}</p>}
      {description && <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{description}</p>}
    </li>
  );
}
