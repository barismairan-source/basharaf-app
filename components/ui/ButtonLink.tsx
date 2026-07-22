import * as React from 'react';
import Link, { type LinkProps } from 'next/link';
import { type VariantProps } from 'class-variance-authority';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from './Button';

export interface ButtonLinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>,
    LinkProps,
    VariantProps<typeof buttonVariants> {
  icon?: LucideIcon;
  children?: React.ReactNode;
}

/**
 * ButtonLink — ناوبری که ظاهرش دکمه است (مثلاً «افزودن» که به یک صفحه‌ی
 * دیگر می‌رود، نه submit می‌کند). همان variant/size های Button، ولی
 * <Link> است — نه دکمه‌ی تودرتوی لینک یا لینک تودرتوی دکمه.
 *
 * مثال:
 *   <ButtonLink href="/transactions/new" variant="primary" icon={Plus}>
 *     تراکنش جدید
 *   </ButtonLink>
 */
export const ButtonLink = React.forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  ({ className, variant, size, icon: Icon, children, ...props }, ref) => {
    const iconSize = size === 'sm' ? 12 : size === 'lg' ? 16 : 14;
    return (
      <Link
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {Icon && <Icon size={iconSize} strokeWidth={1.5} aria-hidden />}
        {children}
      </Link>
    );
  }
);

ButtonLink.displayName = 'ButtonLink';
