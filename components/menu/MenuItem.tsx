'use client';

import { useLanguage } from '@/lib/menu/i18n';
import { cn } from '@/lib/utils';
import type { MenuItem as MenuItemType } from '@/types';

export function MenuItem({ item }: { item: MenuItemType }) {
  const { pick, formatPrice, language } = useLanguage();
  const isEn = language === 'en';

  const title = pick(item.titleEn, item.titleFa);
  const description = pick(item.descriptionEn, item.descriptionFa);
  const unavailableLabel = pick('unavailable', 'موجود نیست');
  const sold = !item.isAvailable;

  return (
    <li className={cn('transition-opacity duration-200', sold ? 'opacity-50' : 'opacity-100')}>
      <div className="flex items-baseline gap-2.5">
        <h3 className={cn('flex-1 font-medium leading-snug text-foreground', isEn ? 'text-lg sm:text-xl' : 'text-base sm:text-[17px]')}>
          <span className={sold ? 'line-through decoration-1' : undefined}>{title}</span>
        </h3>
        {item.price !== null && (
          <span className={cn('flex-shrink-0 tabular-nums text-foreground', isEn ? 'text-base sm:text-lg' : 'text-sm sm:text-base', sold && 'line-through decoration-1')}>
            {formatPrice(item.price)}
          </span>
        )}
      </div>
      {sold && <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{unavailableLabel}</p>}
      {description && <p className={cn('mt-1 leading-relaxed text-muted-foreground', isEn ? 'text-[15px]' : 'text-[13px]')}>{description}</p>}
    </li>
  );
}
