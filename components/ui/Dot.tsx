import { cn } from '@/lib/utils';

export interface DotProps {
  /** رنگ به شکل CSS — مثلاً '#16a34a' یا 'var(--success)' */
  color?: string;
  /** اندازه (پیش‌فرض 1.5 = 6px مطابق پروتوتایپ) */
  size?: 1 | 1.5 | 2;
  className?: string;
}

/**
 * Dot — نقطه‌ی رنگی کوچک، برای نشان دادن state در chipها و filterها.
 *
 * چرا inline-block و نه svg دایره؟
 * - سبک‌تر (بدون SVG overhead)
 * - با کلاس‌های Tailwind قابل تنظیم
 * - برای موارد بصری به اندازه کافی sharp است (شعاع کوچک)
 *
 * استفاده:
 *   <Dot color="#16a34a" />            // سبز (income)
 *   <Dot color="#e11d48" />            // قرمز (expense)
 *   <Dot color="#ca8a04" />            // amber (pending)
 *   <Dot color="#9ca3af" size={2} />   // بزرگ‌تر
 */
export function Dot({ color = '#9ca3af', size = 1.5, className }: DotProps) {
  const sizeClass = size === 1 ? 'w-1 h-1' : size === 2 ? 'w-2 h-2' : 'w-1.5 h-1.5';

  return (
    <span
      className={cn('inline-block rounded-full', sizeClass, className)}
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  );
}
