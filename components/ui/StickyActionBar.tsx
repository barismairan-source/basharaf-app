import * as React from 'react';
import { cn } from '@/lib/utils';

export interface StickyActionBarProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * StickyActionBar — نوار اکشن‌های اصلی فرم (ذخیره/انصراف) که همیشه در
 * دسترس می‌ماند، حتی وقتی فرم بلند است و باید اسکرول شود.
 *
 * موقعیت پایین در موبایل دقیقاً هماهنگ با BottomTabBar+safe-area است
 * (همان محاسبه‌ی `4rem + env(safe-area-inset-bottom)` که Toast/main هم
 * استفاده می‌کنند) تا رویش قرار نگیرد. `position: sticky` نسبت به
 * نزدیک‌ترین ancestor قابل‌اسکرول محاسبه می‌شود — که در app shell همان
 * `<main className="overflow-y-auto">` است، نه کل viewport.
 *
 * استفاده:
 *   <StickyActionBar>
 *     <Button variant="primary" loading={saving} onClick={submit}>ذخیره</Button>
 *     <Button variant="default" onClick={onCancel}>انصراف</Button>
 *   </StickyActionBar>
 */
export function StickyActionBar({ children, className }: StickyActionBarProps) {
  return (
    <div
      className={cn(
        'sticky z-20 -mx-4 md:-mx-6 px-4 md:px-6 py-3 mt-4',
        'bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-0',
        'bg-surface/95 backdrop-blur-sm border-t border-border',
        'flex items-center gap-2 flex-wrap',
        className
      )}
    >
      {children}
    </div>
  );
}
