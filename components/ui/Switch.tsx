'use client';

import { cn } from '@/lib/utils';

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  'aria-label'?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Switch — slide toggle، در پروتوتایپ در Preferences pane استفاده می‌شد.
 *
 * رفتار RTL: thumb از سمت راست (شروع inline) به سمت چپ (پایان inline)
 * حرکت می‌کند هنگام فعال شدن. این طبیعی‌ترین حالت در RTL است.
 *
 * متفاوت با Checkbox:
 * - بصری: pill با thumb لغزنده، نه مربع با علامت
 * - معنایی: روشن/خاموش یک ویژگی (نه «این مورد را انتخاب کنید»)
 * - تغییر معمولاً فوری (بدون submit)
 *
 * استفاده:
 *   <Switch
 *     checked={prefs.darkMode}
 *     onCheckedChange={(v) => setPrefs({ ...prefs, darkMode: v })}
 *     aria-label="حالت تاریک"
 *   />
 */
export function Switch({
  checked,
  onCheckedChange,
  disabled,
  className,
  ...props
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative w-9 h-5 rounded-full transition-colors flex-shrink-0',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-1',
        checked ? 'bg-stone-900' : 'bg-stone-200',
        disabled && 'opacity-60 cursor-not-allowed',
        className
      )}
      {...props}
    >
      {/*
        Thumb position — مطابق پروتوتایپ از top-0.5 و right-* استفاده می‌کنیم.
        در RTL: right یعنی inline-start (شروع)؛ thumb از start (off) به end (on) می‌رود.
      */}
      <span
        className={cn(
          'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all',
          checked ? 'right-0.5' : 'right-[18px]'
        )}
        style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
        aria-hidden="true"
      />
    </button>
  );
}
