'use client';

import * as React from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  hasError?: boolean;
}

/**
 * PasswordInput — input برای رمز عبور.
 *
 * مشخصات (از پروتوتایپ):
 * - آیکن lock سمت راست (RTL → شروع)
 * - آیکن eye/eyeOff سمت چپ، قابل کلیک برای تغییر visibility
 * - dir همیشه LTR چون رمزها ASCII هستند
 *
 * توجه به دسترس‌پذیری: دکمه toggle یک aria-label دارد تا screen reader
 * بفهمد چه می‌کند، و type='button' دارد تا فرم را submit نکند.
 */
export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, hasError, disabled, ...props }, ref) => {
    const [show, setShow] = React.useState(false);

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
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
          <Lock size={14} strokeWidth={1.5} />
        </div>
        <input
          ref={ref}
          type={show ? 'text' : 'password'}
          dir="ltr"
          disabled={disabled}
          className="w-full h-12 pr-10 pl-10 bg-transparent text-[13.5px] text-text placeholder:text-muted/60 focus:outline-none rounded-lg"
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'مخفی کردن رمز عبور' : 'نمایش رمز عبور'}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded text-muted hover:text-text hover:bg-bg flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          {show ? (
            <EyeOff size={14} strokeWidth={1.5} />
          ) : (
            <Eye size={14} strokeWidth={1.5} />
          )}
        </button>
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
