'use client';

import { useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DisclosureProps {
  open: boolean;
  onToggle: () => void;
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  panelClassName?: string;
}

/**
 * Disclosure — الگوی استاندارد WAI-ARIA «Disclosure» برای بخش‌های اختیاری
 * فرم («جزئیات بیشتر»/«تنظیمات پیشرفته»).
 *
 * تفاوت کلیدی با رندر شرطی ساده (`{open && <div>...}`): پنل هیچ‌وقت از DOM
 * حذف نمی‌شود، فقط با `hidden` مخفی می‌شود — یعنی مقدار فیلدهای داخلش
 * (چه state لوکال، چه react-hook-form) هنگام جمع‌شدن هیچ‌وقت گم نمی‌شود.
 *
 * button: `aria-expanded` + `aria-controls` → panel: `id` + `hidden`.
 *
 * استفاده:
 *   <Disclosure open={detailsOpen} onToggle={toggleDetails} label="جزئیات بیشتر">
 *     <Field label="شماره رسید"><Input ... /></Field>
 *   </Disclosure>
 */
export function Disclosure({ open, onToggle, label, children, className, panelClassName }: DisclosureProps) {
  const panelId = useId();

  return (
    <div className={className}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className={cn(
          'flex items-center gap-2 w-full min-h-[44px] text-[12.5px] text-muted hover:text-text',
          'transition-colors select-none focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-accent/40 focus-visible:ring-offset-1 rounded-md'
        )}
      >
        <span className="flex-1 h-px bg-border" aria-hidden="true" />
        <span className="inline-flex items-center gap-1.5 shrink-0">
          {label}
          <ChevronDown
            size={13}
            strokeWidth={1.5}
            className={cn('transition-transform', open && 'rotate-180')}
            aria-hidden="true"
          />
        </span>
        <span className="flex-1 h-px bg-border" aria-hidden="true" />
      </button>

      <div id={panelId} hidden={!open} className={cn('space-y-5 pt-5', panelClassName)}>
        {children}
      </div>
    </div>
  );
}
