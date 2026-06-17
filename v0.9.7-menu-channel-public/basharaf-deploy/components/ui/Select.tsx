'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

/**
 * Select — همان native <select> با ظاهر سفارشی.
 *
 * چرا native و نه Radix/headless؟
 * - دسترس‌پذیری OS-level (روی موبایل picker نیتیو می‌آورد)
 * - تایپ کیبوردی برای جستجو در option‌ها به‌صورت پیش‌فرض
 * - زیر ۵۰۰ بایت JS اضافه نمی‌کند
 *
 * در فاز بعد اگر نیاز به search/multi-select شد، یک کامپوننت Combobox
 * جداگانه با Radix می‌سازیم. این Select ساده باقی می‌ماند.
 *
 * استفاده:
 *   <Select value={branch} onChange={(e) => setBranch(e.target.value)}>
 *     <option value="">— انتخاب کنید —</option>
 *     {BRANCHES.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
 *   </Select>
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, hasError, disabled, children, ...props }, ref) => {
    return (
      <div className={cn('relative', className)}>
        <select
          ref={ref}
          disabled={disabled}
          className={cn(
            'appearance-none w-full h-10 pr-3 pl-9 rounded-md border bg-white text-[13.5px] text-stone-800 focus:outline-none transition-colors',
            hasError
              ? 'border-rose-300 focus:border-rose-400'
              : 'border-stone-200 focus:border-stone-400',
            disabled
              ? 'bg-stone-50/60 cursor-not-allowed text-stone-500'
              : 'cursor-pointer'
          )}
          {...props}
        >
          {children}
        </select>
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
          <ChevronDown size={14} strokeWidth={1.5} />
        </div>
      </div>
    );
  }
);

Select.displayName = 'Select';
