import * as React from 'react';
import { cn } from '@/lib/utils';

export interface MetricGridProps {
  children: React.ReactNode;
  /** حداقل عرض هر کارت قبل از این‌که یک ستون جدید اضافه شود (پیش‌فرض ۲۲۰px) */
  minCardWidth?: number;
  className?: string;
}

/**
 * MetricGrid — گرید واکنش‌گرای کارت‌های متریک (MetricCard/KPICard).
 *
 * چرا auto-fit/minmax به‌جای breakpoint ثابت (`sm:grid-cols-2 lg:grid-cols-4`)؟
 * breakpoint ثابت در عرض‌های بینابینی (مثلاً ۱۴۴۰px با ۳ کارت) نصف صفحه را
 * خالی می‌گذارد چون همیشه با پرش می‌رود روی تعداد ستون بعدی. `auto-fit` +
 * `minmax` مقدار ستون‌ها را پیوسته با عرض واقعی محتوا تطبیق می‌دهد — دقیقاً
 * همان مشکل «فضای خالی در ۱۴۴۰–۱۹۲۰px» که این فاز باید حل کند.
 *
 * استفاده:
 *   <MetricGrid>
 *     <MetricCard label="مجموع درآمد" value={...} />
 *     <MetricCard label="مجموع هزینه" value={...} />
 *   </MetricGrid>
 */
export function MetricGrid({ children, minCardWidth = 220, className }: MetricGridProps) {
  return (
    <div
      className={cn('grid gap-4', className)}
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${minCardWidth}px, 1fr))` }}
    >
      {children}
    </div>
  );
}
