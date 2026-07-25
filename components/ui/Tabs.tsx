'use client';

import { useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { nextRadioIndex } from './SegFilter';

export interface TabItem<T extends string> {
  value: T;
  label: ReactNode;
  /** عدد کوچک کنار برچسب (مثلاً تعداد آیتم در این تب) */
  count?: number;
}

export interface TabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  items: ReadonlyArray<TabItem<T>>;
  'aria-label': string;
  className?: string;
}

/**
 * Tabs — الگوی استاندارد WAI-ARIA «Tabs» (نه radiogroup مثل SegFilter/Toggle).
 *
 * فرق واقعی با SegFilter: اینجا هر تب یک `tabpanel` مرتبط دارد (محتوای
 * متفاوت هر تب) — نه فقط انتخاب یک مقدار از یک گروه. به همین دلیل باید
 * `role=tablist`/`tab`/`tabpanel` واقعی باشد، نه radiogroup، تا screen
 * readerها رابطه‌ی «این تب → این محتوا» را درست اعلام کنند.
 *
 * ناوبری کیبورد از همان منطق تست‌شده‌ی `nextRadioIndex` (که برای
 * SegFilter ساخته شد) استفاده می‌کند — ArrowLeft/Right (جهت‌دار در RTL)
 * + Home/End، roving tabIndex.
 *
 * استفاده:
 *   <Tabs value={tab} onChange={setTab} aria-label="وضعیت داوطلبان"
 *     items={[{ value: 'all', label: 'همه', count: 12 }, ...]} />
 *   <TabPanel value="all" active={tab === 'all'}>...</TabPanel>
 */
export function Tabs<T extends string>({
  value,
  onChange,
  items,
  className,
  ...props
}: TabsProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);
  const ariaLabel = props['aria-label'];

  function focusIndex(i: number) {
    const btn = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[i];
    btn?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const isRtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
    const nextIndex = nextRadioIndex(e.key, index, items.length, isRtl);
    if (nextIndex === null) return;
    e.preventDefault();
    const next = items[nextIndex];
    if (next) {
      onChange(next.value);
      focusIndex(nextIndex);
    }
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      className={cn('inline-flex flex-wrap gap-1 border-b border-border', className)}
    >
      {items.map((item, i) => {
        const isActive = value === item.value;
        return (
          <button
            key={item.value}
            id={`tab-${item.value}`}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${item.value}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(item.value)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={cn(
              'inline-flex items-center gap-1.5 h-10 px-3 -mb-px text-[12.5px] border-b-2 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1 rounded-t-sm',
              isActive
                ? 'border-accent text-text font-medium'
                : 'border-transparent text-muted hover:text-text'
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span
                className={cn(
                  'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10.5px] tabular-nums',
                  isActive ? 'bg-accent-subtle text-accent' : 'bg-bg text-muted'
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export interface TabPanelProps {
  value: string;
  active: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * TabPanel — بدنه‌ی محتوای یک تب. وقتی `active` نیست به‌جای unmount کردن
 * (که state داخلی محتوا را می‌کشد — مثلاً یک فیلد در حال ویرایش)، با
 * `hidden` مخفی می‌شود؛ children همیشه mounted می‌ماند.
 */
export function TabPanel({ value, active, children, className }: TabPanelProps) {
  return (
    <div
      id={`tabpanel-${value}`}
      role="tabpanel"
      aria-labelledby={`tab-${value}`}
      hidden={!active}
      tabIndex={0}
      className={cn('focus-visible:outline-none', className)}
    >
      {children}
    </div>
  );
}
