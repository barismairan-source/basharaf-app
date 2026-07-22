'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /** متن label در سمت چپ (در RTL → بعد از checkbox) */
  label?: React.ReactNode;
}

/**
 * Checkbox — سفارشی، با ظاهر stone و آیکن lucide Check.
 *
 * چرا custom و نه native?
 * - native <input type=checkbox> در همه مرورگرها متفاوت ظاهر می‌شود
 * - این پیاده‌سازی native را مخفی می‌کند و یک <span> با پس‌زمینه نمایش می‌دهد
 * - دسترس‌پذیری حفظ می‌شود (input واقعی پشت صحنه — keyboard، screen reader OK)
 *
 * در پروتوتایپ این در «مرا به خاطر بسپار» login بود.
 *
 * استفاده:
 *   <Checkbox
 *     checked={remember}
 *     onChange={(e) => setRemember(e.target.checked)}
 *     label="مرا به خاطر بسپار"
 *   />
 */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className, checked, ...props }, ref) => {
    return (
      <label
        className={cn(
          'flex items-center gap-2 cursor-pointer select-none',
          className
        )}
      >
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          className="sr-only peer"
          {...props}
        />
        <span
          className={cn(
            'w-4 h-4 rounded border flex items-center justify-center transition-colors',
            'border-stone-300 peer-checked:bg-primary peer-checked:border-primary',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40 peer-focus-visible:ring-offset-1'
          )}
          aria-hidden="true"
        >
          {checked && <Check size={10} strokeWidth={2} className="text-white" />}
        </span>
        {label && (
          <span className="text-[12px] text-stone-600">{label}</span>
        )}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';
