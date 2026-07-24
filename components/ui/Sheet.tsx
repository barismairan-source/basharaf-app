'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** عنوان نوار بالایی */
  title?: React.ReactNode;
  /** محتوای داخل sheet */
  children: React.ReactNode;
  /** حداکثر ارتفاع (پیش‌فرض: ۸۰٪ ارتفاع viewport) */
  maxHeight?: string;
  className?: string;
}

/**
 * Sheet — bottom sheet موبایل برای منوهای فرعی و فرم‌ها.
 * بدون کتابخانه خارجی — فقط CSS transition.
 *
 * نمونه استفاده:
 *   const [open, setOpen] = useState(false);
 *   <Button onClick={() => setOpen(true)}>فیلتر</Button>
 *   <Sheet open={open} onClose={() => setOpen(false)} title="فیلتر سفارش‌ها">
 *     <FilterForm onSubmit={() => setOpen(false)} />
 *   </Sheet>
 *
 * نکته: Sheet در داخل body فیزیکی رندر می‌شود؛ اگر overflow:hidden روی
 * یک جد دارید از portal استفاده کنید یا z-index را بالا ببرید.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  maxHeight = '80vh',
  className,
}: SheetProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLElement | null>(null);

  // قفل اسکرول body وقتی sheet باز است
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // مدیریت focus: باز شدن → فوکوس داخل پنل؛ بسته شدن → برگشت به عنصر triggerکننده.
  // بدون این، کاربر کیبورد/screen reader بعد از باز شدن sheet «پشت» backdrop باقی می‌ماند.
  React.useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement | null;
      panelRef.current?.focus();
    } else {
      triggerRef.current?.focus();
    }
  }, [open]);

  // بستن با کلید Escape + قفل Tab داخل پنل (focus trap)
  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      {/* backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/40 transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
      />

      {/* panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        aria-label={typeof title === 'string' ? title : undefined}
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 bg-surface rounded-t-2xl shadow-modal',
          'transition-transform duration-300 ease-out flex flex-col',
          open ? 'translate-y-0' : 'translate-y-full',
          className
        )}
        style={{ maxHeight }}
      >
        {/* drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* header */}
        {title && (
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <span className="text-[14px] font-medium text-text">{title}</span>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-muted hover:bg-bg transition-colors"
              aria-label="بستن"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>
        )}

        {/* محتوا — با اسکرول داخلی */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-5">
          {children}
        </div>
      </div>
    </>
  );
}
