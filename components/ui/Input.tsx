'use client';

import * as React from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Input — به دو شکل در پروتوتایپ بود:
 *
 *   1. TextInput (در auth): مرتفع (h-11)، با آیکن داخل، dir LTR، برای ایمیل/رمز
 *   2. FormInput (در new-tx, settings): استاندارد (h-10)، dir RTL، بدون آیکن
 *
 * این کامپوننت هر دو را با prop `variant` پشتیبانی می‌کند.
 */

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** آیکن داخل input — معمولاً lucide سمت راست (RTL → leading) */
  icon?: LucideIcon;
  /** آیا فیلد در حالت خطاست؟ → حاشیه rose */
  hasError?: boolean;
  /** فرم استاندارد (h-10) یا auth (h-11) */
  variant?: 'form' | 'auth';
}

/**
 * Input — یک text input تک‌خطی، با آیکن اختیاری و state خطا.
 *
 * استفاده:
 *   <Input placeholder="ایمیل" icon={Mail} dir="ltr" />
 *   <Input value={x} onChange={(e) => setX(e.target.value)} hasError />
 *
 * نکته RTL: آیکن سمت راست قرار می‌گیرد (شروع متن در RTL).
 * در صورت dir="ltr" (مثل ایمیل/شماره)، آیکن همچنان سمت راست — این
 * عمدی است و با پروتوتایپ یکسان.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      icon: Icon,
      hasError,
      variant = 'form',
      disabled,
      type = 'text',
      dir = 'rtl',
      ...props
    },
    ref
  ) => {
    const height = variant === 'auth' ? 'h-12' : 'h-11';
    const fontSize = variant === 'auth' ? 'text-[13.5px]' : 'text-[13.5px]';

    return (
      <div
        className={cn(
          'relative rounded-md border bg-white transition-colors',
          hasError
            ? 'border-rose-300'
            : 'border-stone-200 focus-within:border-stone-500',
          disabled && 'bg-stone-50/60',
          className
        )}
      >
        {Icon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none">
            <Icon size={14} strokeWidth={1.5} />
          </div>
        )}
        <input
          ref={ref}
          type={type}
          dir={dir}
          disabled={disabled}
          className={cn(
            'w-full bg-transparent text-stone-800 placeholder:text-stone-300 focus:outline-none rounded-md',
            height,
            fontSize,
            Icon ? 'pr-10' : 'pr-3',
            'pl-3',
            disabled && 'cursor-not-allowed'
          )}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = 'Input';
