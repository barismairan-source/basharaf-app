import * as React from 'react';
import { cn } from '@/lib/utils';
import { fmt } from '@/lib/utils';
import { formatMoneyShort } from '@/lib/design/format';
import { Sparkline } from './Sparkline';

export interface MetricCardProps {
  /** برچسب بالای عدد */
  label: string;
  /** مقدار — اگر unit='money' با formatMoneyShort نمایش داده می‌شود */
  value: number;
  /** نوع مقدار: money (تومان، پیش‌فرض) یا count (عدد ساده) */
  unit?: 'money' | 'count';
  /** داده‌های sparkline — حداقل ۲ نقطه برای رسم */
  spark?: ReadonlyArray<number>;
  /** رنگ sparkline — پیش‌فرض: accent */
  sparkColor?: string;
  /** جهت تغییر نسبت به دوره قبل */
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

/**
 * MetricCard — کارت نمایش یک عدد خلاصه (موجودی/هزینه/درآمد).
 *
 * نمونه استفاده:
 *   <MetricCard label="درآمد امروز" value={5_400_000} spark={[10,14,9,22,18,25]} />
 *   <MetricCard label="تعداد سفارش" value={42} unit="count" trend="up" />
 *   <MetricCard label="موجودی صندوق" value={12_500_000_000} />
 */
export function MetricCard({
  label,
  value,
  unit = 'money',
  spark,
  sparkColor = '#2563eb',
  trend,
  className,
}: MetricCardProps) {
  const displayValue = unit === 'money' ? formatMoneyShort(value) : fmt(value);

  const trendColor =
    trend === 'up'
      ? 'text-ok'
      : trend === 'down'
        ? 'text-danger'
        : 'text-muted';

  const trendMark = trend === 'up' ? '↑' : trend === 'down' ? '↓' : null;

  return (
    <div
      className={cn(
        'bg-surface border border-border rounded-lg p-4 overflow-hidden relative',
        className
      )}
    >
      {/* sparkline در پس‌زمینه */}
      {spark && spark.length >= 2 && (
        <div className="absolute inset-x-0 bottom-0 pointer-events-none select-none opacity-30">
          <Sparkline
            data={spark}
            color={sparkColor}
            height={48}
            className="w-full"
          />
        </div>
      )}

      <div className="relative z-10">
        <div className="text-[11px] text-muted mb-1.5 tracking-wide">{label}</div>
        <div className="flex items-baseline gap-2">
          <span className="text-[22px] font-semibold text-text leading-none num">
            {displayValue}
          </span>
          {trendMark && (
            <span className={cn('text-[12px] font-medium', trendColor)}>
              {trendMark}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
