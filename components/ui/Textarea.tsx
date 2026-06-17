import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

/**
 * Textarea — multi-line input.
 *
 * leading-7 و resize-none عمدی هستند:
 * - leading-7: متن فارسی فاصله سطر بیشتری نیاز دارد چون ascender/descender بلندتری دارد
 * - resize-none: کاربر نمی‌تواند drag کند و layout را بشکند؛ اگر متن طولانی شد،
 *   rows را افزایش بدهید یا اجازه auto-resize با onChange بدهید
 */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, hasError, rows = 3, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          'w-full px-3 py-2.5 rounded-md border bg-white text-[13.5px] text-stone-800 placeholder:text-stone-400 focus:outline-none resize-none leading-7 transition-colors',
          hasError
            ? 'border-rose-300 focus:border-rose-400'
            : 'border-stone-200 focus:border-stone-400',
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';
