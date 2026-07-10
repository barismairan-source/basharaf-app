import { type LucideIcon } from 'lucide-react';
import { Sparkline } from '@/components/ui';
import { fmt } from '@/lib/utils';
import { formatMoneyShort } from '@/lib/design/format';
import { COLORS } from '@/lib/colors';
import { cn } from '@/lib/utils';

/**
 * KPICard — کارت معیار اصلی داشبورد.
 *
 * چهار variant از پروتوتایپ:
 * - balance (neutral): سفید با حاشیه stone — برای موجودی (می‌تواند مثبت/منفی شود)
 * - income (success): پس‌زمینه emerald-50 ملایم — درآمد
 * - expense (danger): پس‌زمینه rose-50 ملایم — هزینه
 * - pending (warning): پس‌زمینه amber-50 ملایم — در انتظار
 *
 * هر کارت شامل:
 * - label در بالای راست (سمت start در RTL)
 * - icon در بالای چپ (سمت end در RTL)
 * - value بزرگ tabular-nums
 * - واحد «تومان»
 * - sparkline اختیاری در پایین
 *
 * نکته بصری: در پروتوتایپ Dot رنگی کنار label بود. این جزئیات
 * را با CSS variableهای رنگ pass می‌کنیم.
 */

export type KPITone = 'balance' | 'income' | 'expense' | 'pending';

interface KPICardProps {
  tone: KPITone;
  label: string;
  value: number;
  icon: LucideIcon;
  /** داده sparkline اختیاری */
  spark?: readonly number[];
  /** برای موجودی منفی، رنگ value را قرمز کنیم */
  highlightNegative?: boolean;
}

const TONE_STYLES: Record<
  KPITone,
  {
    container: string;
    label: string;
    iconBg: string;
    iconColor: string;
    dot: string;
    sparkColor: string;
  }
> = {
  balance: {
    container: 'bg-white border-stone-200',
    label: 'text-stone-500',
    iconBg: 'bg-stone-100',
    iconColor: 'text-stone-600',
    dot: COLORS.success,
    sparkColor: COLORS.stone500,
  },
  income: {
    container: 'bg-emerald-50/60 border-emerald-100',
    label: 'text-emerald-700',
    iconBg: 'bg-white',
    iconColor: 'text-emerald-700',
    dot: COLORS.success,
    sparkColor: COLORS.success,
  },
  expense: {
    container: 'bg-rose-50/60 border-rose-100',
    label: 'text-rose-700',
    iconBg: 'bg-white',
    iconColor: 'text-rose-700',
    dot: COLORS.danger,
    sparkColor: COLORS.danger,
  },
  pending: {
    container: 'bg-amber-50/60 border-amber-100',
    label: 'text-amber-700',
    iconBg: 'bg-white',
    iconColor: 'text-amber-700',
    dot: COLORS.warning,
    sparkColor: COLORS.warning,
  },
};

export function KPICard({
  tone,
  label,
  value,
  icon: Icon,
  spark,
  highlightNegative = false,
}: KPICardProps) {
  const styles = TONE_STYLES[tone];
  const isNegative = highlightNegative && value < 0;

  return (
    <div
      className={cn(
        'relative rounded-lg border px-5 py-4 overflow-hidden',
        styles.container
      )}
    >
      {/* Header: label + icon */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: styles.dot }}
            aria-hidden="true"
          />
          <span className={cn('text-[12px]', styles.label)}>{label}</span>
        </div>
        <div
          className={cn(
            'w-7 h-7 rounded-md flex items-center justify-center',
            styles.iconBg,
            styles.iconColor
          )}
        >
          <Icon size={14} strokeWidth={1.5} aria-hidden="true" />
        </div>
      </div>

      {/* Value — formatMoneyShort خودش علامت منفی + LTR isolate را مدیریت می‌کند */}
      <div
        className={cn(
          'text-[22px] font-medium tabular-nums leading-none',
          isNegative ? 'text-rose-700' : 'text-stone-900'
        )}
        title={`${fmt(value)} تومان`}
      >
        {formatMoneyShort(value)}
      </div>

      {/* Sparkline (اختیاری) */}
      {spark && spark.length > 1 && (
        <div className="mt-3 -mx-1">
          <Sparkline
            data={spark}
            color={styles.sparkColor}
            height={32}
            width={200}
          />
        </div>
      )}
    </div>
  );
}
