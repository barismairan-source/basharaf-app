'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Variants و سایزها — مستقیماً از پروتوتایپ (TextButton در ui.jsx).
 *
 * چرا cva؟ هر variant و size به‌صورت type-safe در دسترس است،
 * و در صورت اضافه کردن variant جدید، تلفیق با Tailwind class‌ها
 * هیچ‌گونه conflict ایجاد نمی‌کند (به لطف tailwind-merge در cn).
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md border transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-1',
  {
    variants: {
      variant: {
        default: 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50',
        primary: 'bg-stone-900 border-stone-900 text-white hover:bg-stone-800',
        ghost: 'bg-transparent border-transparent text-stone-600 hover:bg-stone-100',
        danger: 'bg-white border-stone-200 text-rose-600 hover:bg-rose-50 hover:border-rose-100',
        // برای دکمه تایید/رد در DetailPanel که در پروتوتایپ class override داشتند:
        success: 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700',
        destructive: 'bg-rose-600 border-rose-600 text-white hover:bg-rose-700',
      },
      size: {
        sm: 'h-8 px-3 text-[12.5px] gap-1.5',
        md: 'h-10 px-4 text-[13px] gap-2',
        lg: 'h-11 px-5 text-[13.5px] gap-2',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'>,
    VariantProps<typeof buttonVariants> {
  /** آیکن — کامپوننت lucide-react مثل Plus، Check، X */
  icon?: LucideIcon;
  /** اگر true، spinner جایگزین آیکن و دکمه disabled */
  loading?: boolean;
  children?: React.ReactNode;
}

/**
 * Button — دکمه استاندارد، با آیکن اختیاری و loading state.
 *
 * مثال:
 *   <Button variant="primary" icon={Plus}>ثبت تراکنش</Button>
 *   <Button loading>در حال ارسال...</Button>
 *   <Button variant="ghost" size="sm" icon={X} aria-label="بستن" />
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      icon: Icon,
      loading,
      disabled,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const iconSize = size === 'sm' ? 12 : size === 'lg' ? 16 : 14;

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {loading ? (
          <Loader2 size={iconSize} strokeWidth={1.5} className="animate-spin" />
        ) : Icon ? (
          <Icon size={iconSize} strokeWidth={1.5} />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
