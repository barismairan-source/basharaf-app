import * as React from 'react';
import { Inbox, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmptyProps {
  /** آیکن سفارشی — پیش‌فرض: Inbox */
  icon?: LucideIcon;
  /** عنوان اصلی */
  title: React.ReactNode;
  /** متن کوچکتر زیر title */
  sub?: React.ReactNode;
  /** دکمه action یا هر JSX دیگر */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Empty — placeholder وقتی داده‌ای برای نمایش نیست.
 *
 * در پروتوتایپ این در:
 * - dashboard recent list خالی
 * - history view با فیلتر خالی
 * - notifications dropdown خالی
 * - categories pane خالی
 *
 * استفاده:
 *   <Empty title="هنوز تراکنشی ثبت نشده است." />
 *
 *   <Empty
 *     icon={Search}
 *     title="نتیجه‌ای یافت نشد"
 *     sub="فیلترها را تغییر دهید یا یک تراکنش جدید ثبت کنید."
 *   />
 *
 *   <Empty
 *     title="هنوز تراکنشی ثبت نشده است."
 *     action={<Button icon={Plus} variant="primary" size="sm">ثبت تراکنش</Button>}
 *   />
 */
export function Empty({
  icon: Icon = Inbox,
  title,
  sub,
  action,
  className,
}: EmptyProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-14 text-center',
        className
      )}
    >
      <div className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mb-3">
        <Icon size={16} strokeWidth={1.5} />
      </div>
      <div className="text-[13.5px] text-stone-700">{title}</div>
      {sub && (
        <div className="text-[12px] text-stone-400 mt-1 max-w-xs">{sub}</div>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
