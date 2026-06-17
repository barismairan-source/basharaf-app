import { Card, CardHeader, CardBody, Empty } from '@/components/ui';
import { fmt } from '@/lib/utils';
import { PieChart } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * BreakdownCard — تفکیک یک معیار بر اساس دسته.
 *
 * در داشبورد دو تا از این داریم: یکی برای هزینه، یکی برای درآمد.
 * هر ردیف یک bar افقی نشان می‌دهد که نسبت آن دسته را به کل تجسم می‌کند.
 *
 * چرا custom bar به‌جای کتابخانه چارت؟
 * - Recharts/Chart.js در bundle ۱۰۰+kB اضافه می‌کنند
 * - این تجسم ساده فقط با div+CSS قابل پیاده‌سازی است
 * - rendering سریع‌تر، tree-shake آسان‌تر
 *
 * نکته RTL: bar از سمت start (راست) شروع می‌شود و به سمت end (چپ) رشد می‌کند.
 * این با `start-0` و `w-{percent}%` کار می‌کند چون margin/padding اینلاین
 * در RTL flip می‌شوند.
 */
interface BreakdownCardProps {
  title: string;
  subtitle?: string;
  /** tone رنگ bar — match KPI card های مرتبط */
  tone: 'income' | 'expense';
  data: ReadonlyArray<{
    category: string;
    amount: number;
    percent: number;
  }>;
}

export function BreakdownCard({
  title,
  subtitle,
  tone,
  data,
}: BreakdownCardProps) {
  const colorClasses =
    tone === 'income'
      ? { bg: 'bg-emerald-100', fill: 'bg-emerald-500' }
      : { bg: 'bg-rose-100', fill: 'bg-rose-500' };

  return (
    <Card>
      <CardHeader
        title={title}
        sub={subtitle ?? `${data.length} دسته`}
      />
      <CardBody>
        {data.length === 0 ? (
          <Empty
            icon={PieChart}
            title="داده‌ای برای نمایش نیست"
            sub="بعد از تایید اولین تراکنش‌ها، تفکیک اینجا ظاهر می‌شود."
          />
        ) : (
          <div className="space-y-3">
            {data.map((row) => (
              <div key={row.category}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-[12.5px] text-stone-700 truncate">
                    {row.category}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-[12px] text-stone-900 tabular-nums font-medium">
                      {fmt(row.amount)}
                    </div>
                    <div className="text-[10.5px] text-stone-400 tabular-nums w-10 text-end">
                      {Math.round(row.percent)}٪
                    </div>
                  </div>
                </div>
                {/* Bar */}
                <div
                  className={cn(
                    'relative h-1.5 rounded-full overflow-hidden',
                    colorClasses.bg
                  )}
                >
                  <div
                    className={cn(
                      'absolute top-0 start-0 h-full rounded-full transition-all',
                      colorClasses.fill
                    )}
                    style={{ width: `${Math.max(2, row.percent)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
