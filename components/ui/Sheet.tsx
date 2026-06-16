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

  // بستن با کلید Escape
  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
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
        role="dialog"
        aria-modal="true"
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
