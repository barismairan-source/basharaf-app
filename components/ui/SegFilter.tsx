'use client';

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
  className?: string;
}

/**
 * SegFilter — نسخه کوچکتر Toggle، برای فیلتر در نوار بالای جدول.
 *
 * تفاوت با Toggle:
 * - ارتفاع کوچکتر (30px به جای 32px)
 * - بدون pill برجسته — حالت انتخاب با bg-stone-100
 * - معمولاً ۳-۴ گزینه (نه دو)
 *
 * در پروتوتایپ این برای فیلترهای history view بود (همه/درآمد/هزینه، یا
 * همه/در انتظار/تایید شده/رد شده).
 *
 * استفاده:
 *   <SegFilter
 *     value={statusFilter}
 *     onChange={setStatusFilter}
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
}: SegFilterProps<T>) {
  return (
    <div
      role="group"
      className={cn(
        'inline-flex p-0.5 bg-white border border-stone-200 rounded-md',
        className
      )}
    >
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={isActive}
            className={cn(
              'h-[30px] px-3 text-[12px] rounded inline-flex items-center gap-1.5 transition-colors',
              isActive
                ? 'bg-stone-100 text-stone-800'
                : 'text-stone-500 hover:text-stone-700'
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
