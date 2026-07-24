'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

export interface FilterToolbarProps {
  /** کنترل‌های فیلتر (Select، Input جستجو، JalaliDatePicker، SegFilter، ...) */
  children: React.ReactNode;
  /** اکشن‌های سمت راست‌تر (چاپ، خروجی اکسل) — از فیلترها جدا نمایش داده می‌شود */
  actions?: React.ReactNode;
  /** اگر داده شود، دکمه‌ی «پاک کردن فیلترها» نمایش داده می‌شود */
  onClearFilters?: () => void;
  /** چند فیلتر غیر-پیش‌فرض فعال است؟ — برای نمایش دکمه‌ی پاک‌سازی فقط وقتی واقعاً فیلتری اعمال شده */
  activeFilterCount?: number;
  /** چسبیده به بالای ناحیه‌ی اسکرول (برای لیست‌های بلند) */
  sticky?: boolean;
  className?: string;
}

/**
 * FilterToolbar — نوار فیلتر استاندارد بالای لیست/جدول.
 *
 * الگویی که این کامپوننت یک‌جا می‌کند: `flex flex-wrap items-center gap-2`
 * برای کنترل‌های فیلتر + دکمه‌ی پاک‌سازی وضعیت‌دار — این ترکیب در
 * transactions و reports دستی و کمی متفاوت از هم پیاده‌سازی شده بود.
 *
 * `sticky`: هنگام اسکرول لیست‌های بلند، فیلترها در بالای ناحیه‌ی محتوا
 * (زیر Header که خودش sticky top-0 است) ثابت می‌مانند — از `top-16`
 * (ارتفاع واقعی Header) استفاده می‌کند تا هم‌پوشانی نداشته باشند.
 *
 * استفاده:
 *   <FilterToolbar
 *     onClearFilters={clearAll}
 *     activeFilterCount={activeCount}
 *     actions={<Button variant="default" size="field" icon={Download}>خروجی</Button>}
 *   >
 *     <Input icon={Search} placeholder="جستجو..." ... />
 *     <Select ...>...</Select>
 *   </FilterToolbar>
 */
export function FilterToolbar({
  children,
  actions,
  onClearFilters,
  activeFilterCount = 0,
  sticky,
  className,
}: FilterToolbarProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2',
        sticky && 'sticky top-16 z-20 bg-surface/95 backdrop-blur-sm py-2 -mx-1 px-1',
        className
      )}
    >
      {children}

      {onClearFilters && activeFilterCount > 0 && (
        <Button variant="ghost" size="field" icon={X} onClick={onClearFilters}>
          پاک کردن فیلترها ({activeFilterCount})
        </Button>
      )}

      {actions && <div className="flex items-center gap-2 sm:mr-auto">{actions}</div>}
    </div>
  );
}
