import * as React from 'react';
import { type LucideIcon } from 'lucide-react';
import { FileSearch } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  /** آیکن — پیش‌فرض: FileSearch */
  icon?: LucideIcon;
  /** عنوان اصلی */
  title: React.ReactNode;
  /** توضیح کوچکتر */
  description?: React.ReactNode;
  /** دکمه اقدام */
  action?: React.ReactNode;
  className?: string;
}

/**
 * EmptyState — حالت خالی برای سطح صفحه (page-level).
 * برای حالت خالی inline (داخل کارت/پنل) از <Empty> استفاده کنید.
 *
 * نمونه استفاده:
 *   <EmptyState
 *     title="هنوز هیچ سفارشی ثبت نشده"
 *     description="اولین سفارش از صفحه‌ی منوی عمومی ثبت می‌شود."
 *     action={<Button icon={Plus} variant="primary">افزودن محصول</Button>}
 *   />
 *
 *   <EmptyState
 *     icon={Search}
 *     title="نتیجه‌ای یافت نشد"
 *     description="فیلترها را تغییر دهید یا جستجوی دیگری امتحان کنید."
 *   />
 */
export function EmptyState({
  icon: Icon = FileSearch,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center min-h-[320px] text-center px-6 py-16',
        className
      )}
    >
      {/* آیکن در دایره‌ی روشن */}
      <div className="w-16 h-16 rounded-full bg-bg border border-border flex items-center justify-center text-muted mb-5">
        <Icon size={28} strokeWidth={1.25} />
      </div>

      {/* عنوان */}
      <div className="text-[15px] font-medium text-text max-w-xs leading-snug">
        {title}
      </div>

      {/* توضیح */}
      {description && (
        <div className="text-[13px] text-muted mt-2 max-w-sm leading-relaxed">
          {description}
        </div>
      )}

      {/* دکمه اقدام */}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
