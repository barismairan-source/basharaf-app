'use client';

import * as React from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** آیکن داخل input — معمولاً lucide سمت راست (RTL → leading) */
  icon?: LucideIcon;
  /** آیا فیلد در حالت خطاست؟ → حاشیه danger */
  hasError?: boolean;
  /** فرم استاندارد (h-10) یا auth (h-12) */
  variant?: 'form' | 'auth';
}

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
    const height = variant === 'auth' ? 'h-12' : 'h-10';
    const fontSize = 'text-[13.5px]';

    return (
      <div
        className={cn(
          'relative rounded-lg border bg-surface transition-colors',
          hasError
            ? 'border-danger'
            : 'border-border focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20',
          disabled && 'bg-bg opacity-60',
          className
        )}
      >
        {Icon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
            <Icon size={14} strokeWidth={1.5} />
          </div>
        )}
        <input
          ref={ref}
          type={type}
          dir={dir}
          disabled={disabled}
          className={cn(
            'w-full bg-transparent text-text placeholder:text-muted/60 focus:outline-none rounded-lg',
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
