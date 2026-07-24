'use client';

import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export interface PageHeaderProps {
  title: string;
  /** اگر داده شود، به جای router.back() به این آدرس می‌رود */
  backHref?: string;
  /** کالبک دلخواه — اولویت با این است اگر داده شود */
  onBack?: () => void;
  backLabel?: string;
  /** دکمه‌های سمت چپ (در RTL: انتهای هدر) */
  actions?: React.ReactNode;
  /** پیش‌فرض true — برای صفحات سطح‌بالا بدون ناوبری برگشت، false بده (یا از PageToolbar استفاده کن) */
  showBack?: boolean;
  /** در صفحات print نادیده گرفته می‌شود */
  className?: string;
}

/**
 * PageHeader — هدر استاندارد صفحات فرعی.
 *
 * RTL layout:
 *   [→ بازگشت]   [عنوان صفحه]   [actions]
 *    سمت راست      میانی           سمت چپ
 *
 * دکمه برگشت: ArrowRight (→) چون در RTL «بازگشت» به معنای
 * حرکت به سمت راست است.
 */
export function PageHeader({
  title,
  backHref,
  onBack,
  backLabel = 'بازگشت',
  actions,
  showBack = true,
  className = '',
}: PageHeaderProps) {
  const router = useRouter();

  function handleBack() {
    if (onBack) { onBack(); return; }
    if (backHref) { router.push(backHref); return; }
    router.back();
  }

  return (
    <div className={`flex items-center gap-3 print:hidden ${className}`}>
      {showBack && (
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-1 text-[12px] text-muted hover:text-text transition-colors min-h-[44px] px-1 shrink-0"
          aria-label={backLabel}
        >
          <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
          <span className="hidden sm:inline">{backLabel}</span>
        </button>
      )}

      <h1 className="flex-1 text-[17px] font-semibold text-text truncate">
        {title}
      </h1>

      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
