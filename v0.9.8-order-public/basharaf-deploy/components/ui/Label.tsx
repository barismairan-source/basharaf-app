import * as React from 'react';
import { cn } from '@/lib/utils';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  /** اگر true، عبارت «(اختیاری)» در سمت چپ اضافه می‌شود */
  optional?: boolean;
  children: React.ReactNode;
}

/**
 * Label — متن کوچک بالای فیلد فرم.
 *
 * استفاده:
 *   <Label htmlFor="title">عنوان تراکنش</Label>
 *   <Label optional>یادداشت</Label>
 *
 * نکته: htmlFor باید با id input تطابق داشته باشد برای دسترس‌پذیری.
 */
export function Label({ optional, children, className, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        'text-[12px] text-stone-500 mb-1.5 flex items-center gap-1.5',
        className
      )}
      {...props}
    >
      {children}
      {optional && (
        <span className="text-stone-400 text-[11px]">(اختیاری)</span>
      )}
    </label>
  );
}
