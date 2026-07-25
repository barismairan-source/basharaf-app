'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface PopoverProps {
  /** محتوای دکمه‌ی trigger (متن/آیکن) */
  trigger: ReactNode;
  /** aria-label دکمه اگر trigger فقط آیکن است */
  triggerLabel?: string;
  /** badge عددی روی دکمه (مثلاً تعداد فیلتر فعال) */
  badge?: number;
  /** محتوای پنل — یا JSX ساده، یا تابعی که close() می‌گیرد (برای بستن پنل بعد از انتخاب یک آیتم) */
  children: ReactNode | ((close: () => void) => ReactNode);
  /** 'menu' → role=menu روی پنل + ناوبری ArrowDown/ArrowUp بین [role=menuitem]. پیش‌فرض: پنل فرم/فیلتر معمولی بدون role خاص. */
  panelRole?: 'menu';
  /** پنل از کدام سمت شروع شود (در RTL: start=راست) */
  align?: 'start' | 'end';
  panelClassName?: string;
  triggerClassName?: string;
  className?: string;
}

/**
 * Popover — پنل شناور عمومی برای دو کاربرد رایج این پروژه:
 * ۱. Disclosure فیلترهای پیشرفته (بدون role خاص — یک فرم کوچک)
 * ۲. منوی اکشن‌های ثانویه («⋮ بیشتر» — چاپ/ورود دسته‌ای) با role=menu
 *
 * الگوی outside-click/Escape از `BranchPicker.tsx` عمومی‌سازی شده — قبلاً
 * این مکانیزم در چند جا (BranchPicker و مشابه) کلمه‌به‌کلمه تکرار شده بود.
 *
 * دسترس‌پذیری:
 * - trigger: aria-haspopup، aria-expanded
 * - panelRole="menu": ArrowDown/ArrowUp بین [role=menuitem]، Home/End
 * - Escape همیشه می‌بندد و focus را به trigger برمی‌گرداند
 * - کلیک بیرون پنل می‌بندد
 */
export function Popover({
  trigger,
  triggerLabel,
  badge,
  children,
  panelRole,
  align = 'start',
  panelClassName,
  triggerClassName,
  className,
}: PopoverProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;

    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (panelRole !== 'menu') return;
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return;
      const items = panelRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])');
      if (!items || items.length === 0) return;
      e.preventDefault();
      const list = Array.from(items);
      const currentIndex = list.indexOf(document.activeElement as HTMLElement);
      let nextIndex: number;
      if (e.key === 'Home') nextIndex = 0;
      else if (e.key === 'End') nextIndex = list.length - 1;
      else if (e.key === 'ArrowDown') nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % list.length;
      else nextIndex = currentIndex < 0 ? list.length - 1 : (currentIndex - 1 + list.length) % list.length;
      list[nextIndex]?.focus();
    }

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    // اولین آیتم منو هنگام باز شدن focus می‌گیرد — قابل کشف با کیبورد بدون Tab اضافه
    if (panelRole === 'menu') {
      const first = panelRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])');
      first?.focus();
    }
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, panelRole]);

  return (
    <div ref={containerRef} className={cn('relative inline-block', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup={panelRole === 'menu' ? 'menu' : 'dialog'}
        aria-expanded={open}
        aria-label={triggerLabel}
        className={cn(
          'inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-surface text-[12px] text-muted hover:text-text transition-colors relative',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1',
          triggerClassName
        )}
      >
        {trigger}
        {badge !== undefined && badge > 0 && (
          <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-accent text-white text-[10px] font-medium tabular-nums">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          role={panelRole}
          className={cn(
            'absolute top-11 z-40 min-w-[220px] bg-surface border border-border rounded-lg shadow-dropdown animate-fade-in overflow-hidden',
            align === 'start' ? 'start-0' : 'end-0',
            panelClassName
          )}
        >
          {typeof children === 'function' ? children(close) : children}
        </div>
      )}
    </div>
  );
}
