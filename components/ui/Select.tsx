'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

/**
 * Select — native <select> با ظاهر سفارشی.
 *
 * چرا native و نه Radix/headless؟
 * - دسترس‌پذیری OS-level (روی موبایل picker نیتیو می‌آورد)
 * - تایپ کیبوردی برای جستجو در option‌ها به‌صورت پیش‌فرض
 * - زیر ۵۰۰ بایت JS اضافه نمی‌کند
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, hasError, disabled, children, ...props }, ref) => {
    return (
      <div className={cn('relative', className)}>
        <select
          ref={ref}
          disabled={disabled}
          className={cn(
            'appearance-none w-full h-11 sm:h-10 pr-3 pl-9 rounded-lg border bg-surface',
            'text-[13.5px] text-text focus:outline-none transition-colors',
            hasError
              ? 'border-danger focus:border-danger'
              : 'border-border focus:border-accent focus:ring-2 focus:ring-accent/40',
            disabled
              ? 'bg-bg opacity-60 cursor-not-allowed text-muted'
              : 'cursor-pointer'
          )}
          {...props}
        >
          {children}
        </select>
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
          <ChevronDown size={14} strokeWidth={1.5} />
        </div>
      </div>
    );
  }
);

Select.displayName = 'Select';
