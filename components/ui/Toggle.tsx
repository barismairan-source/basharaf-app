'use client';

import { useRef } from 'react';
import { cn } from '@/lib/utils';
import { Dot } from './Dot';
import { nextRadioIndex } from './SegFilter';

export interface ToggleOption<T extends string> {
  value: T;
  label: string;
  /** رنگ Dot سمت چپ label (اختیاری) */
  dot?: string;
}

export interface ToggleProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<ToggleOption<T>>;
  /** برای screen reader — نام گروه (مثلاً «نوع تراکنش») */
  'aria-label'?: string;
  className?: string;
}

/**
 * Toggle — دو/سه‌حالته بزرگ، با pill انتخاب‌شده.
 *
 * در پروتوتایپ این برای انتخاب «درآمد / هزینه» در فرم تراکنش جدید بود.
 *
 * الگوی WAI-ARIA APG «Radio Group» — همان منطق ناوبری کیبورد `SegFilter`
 * (roving tabIndex + ArrowLeft/Right/Home/End، جهت‌دار در RTL) با ظاهر
 * بزرگ‌تر/لمسی‌تر (۴۴px) برای فرم‌هایی که این انتخاب، اولین و مهم‌ترین
 * تصمیم کاربر است (مثلاً نوع تراکنش).
 *
 * این کامپوننت **generic** است تا callers اگر typing مشخص داشته باشند
 * (مثلاً value: 'income' | 'expense')، TypeScript جلوی string دلخواه را بگیرد.
 *
 * استفاده:
 *   const [type, setType] = useState<TransactionType>('expense');
 *   <Toggle
 *     value={type}
 *     onChange={setType}
 *     aria-label="نوع تراکنش"
 *     options={[
 *       { value: 'income',  label: 'درآمد', dot: '#16a34a' },
 *       { value: 'expense', label: 'هزینه', dot: '#e11d48' },
 *     ]}
 *   />
 */
export function Toggle<T extends string>({
  value,
  onChange,
  options,
  className,
  ...props
}: ToggleProps<T>) {
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
        'inline-flex p-0.5 bg-stone-100 rounded-md border border-stone-200',
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
              'flex-1 h-11 sm:h-9 px-4 text-[12.5px] rounded transition-all flex items-center justify-center gap-1.5',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1',
              isActive
                ? 'bg-white text-stone-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)] border border-stone-200'
                : 'text-stone-500 hover:text-stone-700 border border-transparent'
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
