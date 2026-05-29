'use client';

import { cn } from '@/lib/utils';
import { Dot } from './Dot';

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
  className?: string;
}

/**
 * Toggle — دو/سه‌حالته بزرگ، با pill انتخاب‌شده.
 *
 * در پروتوتایپ این برای انتخاب «درآمد / هزینه» در فرم تراکنش جدید بود.
 *
 * این کامپوننت **generic** است تا callers اگر typing مشخص داشته باشند
 * (مثلاً value: 'income' | 'expense')، TypeScript جلوی string دلخواه را بگیرد.
 *
 * استفاده:
 *   const [type, setType] = useState<TransactionType>('expense');
 *   <Toggle
 *     value={type}
 *     onChange={setType}
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
}: ToggleProps<T>) {
  return (
    <div
      role="group"
      className={cn(
        'inline-flex p-0.5 bg-stone-100 rounded-md border border-stone-200',
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
              'flex-1 h-8 px-4 text-[12.5px] rounded transition-all flex items-center justify-center gap-1.5',
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
