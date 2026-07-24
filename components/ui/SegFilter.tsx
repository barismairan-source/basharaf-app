'use client';

import { useRef } from 'react';
import { cn } from '@/lib/utils';
import { Dot } from './Dot';

export interface SegFilterOption<T extends string> {
  value: T;
  label: string;
  dot?: string;
}

export interface SegFilterProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<SegFilterOption<T>>;
  /** برای screen reader — نام گروه (مثلاً «فیلتر وضعیت»). اگر ندهید، فقط role=radiogroup بدون نام است. */
  'aria-label'?: string;
  className?: string;
}

/**
 * منطق خالص ناوبری کیبورد radiogroup — از JSX جدا شده تا بدون DOM/رندر
 * قابل تست باشد. در RTL، ArrowLeft/ArrowRight نسبت به جهت بصری معکوس می‌شوند
 * (مطابق الگوی WAI-ARIA APG Radio Group).
 *
 * برمی‌گرداند: ایندکس گزینه‌ی بعدی، یا null اگر کلید مربوط به ناوبری نبود.
 */
export function nextRadioIndex(
  key: string,
  currentIndex: number,
  count: number,
  isRtl: boolean
): number | null {
  const nextKey = isRtl ? 'ArrowLeft' : 'ArrowRight';
  const prevKey = isRtl ? 'ArrowRight' : 'ArrowLeft';

  if (key === nextKey || key === 'ArrowDown') return (currentIndex + 1) % count;
  if (key === prevKey || key === 'ArrowUp') return (currentIndex - 1 + count) % count;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return null;
}

/**
 * SegFilter — نسخه کوچکتر Toggle، برای فیلتر در نوار بالای جدول.
 *
 * الگوی WAI-ARIA APG «Radio Group»: role=radiogroup، هر گزینه role=radio با
 * aria-checked، roving tabIndex (فقط گزینه‌ی فعال tabbable است)، و ناوبری
 * با ArrowLeft/ArrowRight/Home/End (جهت‌دار نسبت به dir سند — در RTL معکوس
 * می‌شود تا با جهت بصری هم‌خوانی داشته باشد).
 *
 * تفاوت با Toggle:
 * - ارتفاع: ۳۶px روی موبایل (لمسی)، ۳۰px از sm به بالا (فشرده دسکتاپ)
 * - بدون pill برجسته — حالت انتخاب با bg-stone-100
 * - معمولاً ۳-۴ گزینه (نه دو)
 *
 * استفاده:
 *   <SegFilter
 *     value={statusFilter}
 *     onChange={setStatusFilter}
 *     aria-label="فیلتر وضعیت"
 *     options={[
 *       { value: 'all',      label: 'همه' },
 *       { value: 'pending',  label: 'در انتظار', dot: '#ca8a04' },
 *       { value: 'approved', label: 'تایید شده', dot: '#16a34a' },
 *       { value: 'rejected', label: 'رد شده',    dot: '#e11d48' },
 *     ]}
 *   />
 */
export function SegFilter<T extends string>({
  value,
  onChange,
  options,
  className,
  ...props
}: SegFilterProps<T>) {
  const groupRef = useRef<HTMLDivElement>(null);
  const ariaLabel = props['aria-label'];

  function focusIndex(i: number) {
    const btn = groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[i];
    btn?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const isRtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
    const nextIndex = nextRadioIndex(e.key, index, options.length, isRtl);

    if (nextIndex === null) return;
    e.preventDefault();
    const next = options[nextIndex];
    if (next) {
      onChange(next.value);
      focusIndex(nextIndex);
    }
  }

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex p-0.5 bg-surface border border-border rounded-md',
        className
      )}
    >
      {options.map((option, i) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={cn(
              'h-9 sm:h-[30px] px-3 text-[12px] rounded inline-flex items-center gap-1.5 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1',
              isActive
                ? 'bg-bg text-text'
                : 'text-muted hover:text-text'
            )}
          >
            {option.dot && <Dot color={option.dot} />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
