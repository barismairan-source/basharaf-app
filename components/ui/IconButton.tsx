'use client';

import * as React from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const SIZE_MAP = {
  xs: { box: 'w-7 h-7', icon: 12 },
  sm: { box: 'w-8 h-8', icon: 14 },
  md: { box: 'w-9 h-9', icon: 16 },
} as const;

const LIGHT_TONE_MAP = {
  default: 'text-muted hover:text-text hover:bg-bg',
  danger:  'text-muted hover:text-danger hover:bg-danger-subtle',
  success: 'text-muted hover:text-ok hover:bg-ok-subtle',
  warning: 'text-muted hover:text-warn hover:bg-warn-subtle',
} as const;

const DARK_TONE_MAP = {
  default: 'text-stone-400 hover:text-stone-100 hover:bg-stone-800',
  danger:  'text-stone-400 hover:text-red-400 hover:bg-red-950/40',
  success: 'text-stone-400 hover:text-emerald-400 hover:bg-emerald-950/40',
  warning: 'text-stone-400 hover:text-amber-400 hover:bg-amber-950/40',
} as const;

export interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: LucideIcon;
  /** الزامی — نام قابل‌دسترس (screen reader). اگر title ندی، همین مقدار tooltip هم می‌شود. */
  'aria-label': string;
  size?: keyof typeof SIZE_MAP;
  /** رنگ hover متناسب با معنای اقدام — تأیید/موفقیت (success)، حذف/خروج (danger)، هشدار (warning). */
  tone?: 'default' | 'danger' | 'success' | 'warning';
  /** true → روی زمینه‌ی تیره‌ی پنل Super Admin رندر می‌شود (رنگ‌های stone بجای توکن‌های روشن). */
  dark?: boolean;
  loading?: boolean;
}

/**
 * IconButton — دکمه‌ی فقط-آیکن استاندارد (بستن، رفرش، تلاش مجدد، حذف، ...).
 *
 * الگویی که این کامپوننت جایگزینش می‌کند، ۲۶+ بار تقریباً کلمه‌به‌کلمه در
 * پروژه تکرار شده بود:
 *   className="w-8 h-8 flex items-center justify-center rounded-md
 *              text-muted hover:text-text hover:bg-bg transition-colors"
 *
 * مثال:
 *   <IconButton icon={X} aria-label="بستن" onClick={onClose} />
 *   <IconButton icon={RefreshCw} aria-label="بارگذاری مجدد" loading={loading} onClick={load} />
 *   <IconButton icon={LogOut} aria-label="خروج از حساب" tone="danger" onClick={logout} />
 *   <IconButton icon={X} aria-label="بستن" dark onClick={onClose} /> — پنل ادمین
 */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon: Icon,
      size = 'sm',
      tone = 'default',
      dark = false,
      loading = false,
      disabled,
      className,
      title,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const { box, icon: iconSize } = SIZE_MAP[size];
    const ariaLabel = props['aria-label'];
    const toneClass = dark ? DARK_TONE_MAP[tone] : LIGHT_TONE_MAP[tone];

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        title={title ?? ariaLabel}
        className={cn(
          box,
          'flex items-center justify-center rounded-md transition-colors flex-shrink-0',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          toneClass,
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 size={iconSize} strokeWidth={1.5} className="animate-spin" />
        ) : (
          <Icon size={iconSize} strokeWidth={1.5} aria-hidden />
        )}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
