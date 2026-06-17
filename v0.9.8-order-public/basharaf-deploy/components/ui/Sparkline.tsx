import * as React from 'react';

export interface SparklineProps {
  /** آرایه اعداد — هر عدد یک نقطه روی نمودار */
  data: ReadonlyArray<number>;
  /** رنگ خط (و gradient) */
  color?: string;
  height?: number;
  width?: number;
  className?: string;
}

/**
 * Sparkline — نمودار خطی کوچک برای پشت KPI کارت‌ها.
 *
 * چرا inline SVG و نه Recharts/D3؟
 * - نیازی به interactivity نیست (tooltip ندارد)
 * - یک نقطه رندر می‌شود، نیازی به re-layout نداریم
 * - حدود ۲ کیلوبایت کد، بدون dependency
 *
 * برای نمودار interactive (مثلاً revenue over time)، در فاز API
 * یک کامپوننت LineChart با Recharts جداگانه می‌سازیم.
 *
 * نکته dataLength: حداقل ۲ نقطه نیاز است. اگر کمتر، یک خط افقی رسم می‌شود.
 */
export function Sparkline({
  data,
  color = '#a3a3a0',
  height = 44,
  width = 220,
  className,
}: SparklineProps) {
  // Stable gradient id — از خود data و رنگ مشتق می‌شود تا با useMemo سازگار بماند
  // و در hydration mismatch نشود (Math.random در SSR و client متفاوت بود).
  const gradientId = React.useMemo(() => {
    const colorKey = color.replace('#', '');
    const dataKey = data.length;
    return `sparkline-${colorKey}-${dataKey}`;
  }, [color, data.length]);

  if (data.length < 2) {
    // Edge case — اگر داده کم بود، یک خط افقی نمایش بده
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className={className}
        aria-hidden="true"
      >
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke={color}
          strokeWidth={1.25}
          strokeLinecap="round"
        />
      </svg>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1; // جلوگیری از تقسیم بر صفر اگر همه مقادیر برابر بودند
  const stepX = width / (data.length - 1);
  const padding = 3;

  const points = data.map<[number, number]>((v, i) => [
    i * stepX,
    height - ((v - min) / range) * (height - 2 * padding) - padding,
  ]);

  const linePath = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ');

  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path
        d={linePath}
        stroke={color}
        strokeWidth={1.25}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
