import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Chip variants — مستقیماً tonalityهای پروتوتایپ.
 *
 * - neutral: خاکستری، برای labelهای عمومی («قفل شده»، تعداد کلی)
 * - green: سبز، برای approved، income، success
 * - red: قرمز، برای rejected، expense، danger
 * - amber: زرد، برای pending، در انتظار، warning
 */
const chipVariants = cva(
  'inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full border',
  {
    variants: {
      tone: {
        neutral: 'bg-bg text-muted border-border',
        green:   'bg-ok-subtle text-ok border-ok/20',
        red:     'bg-danger-subtle text-danger border-danger/20',
        amber:   'bg-warn-subtle text-warn border-warn/20',
      },
    },
    defaultVariants: {
      tone: 'neutral',
    },
  }
);

export interface ChipProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof chipVariants> {
  children: React.ReactNode;
}

/**
 * Chip — pill برای نمایش status یا label.
 *
 * استفاده:
 *   <Chip tone="amber"><Dot color="#ca8a04" />در انتظار</Chip>
 *   <Chip tone="green"><Check size={11} />تایید شده</Chip>
 *   <Chip tone="red"><X size={11} />رد شده</Chip>
 *   <Chip><Lock size={10} />قفل شده</Chip>   // tone پیش‌فرض neutral
 */
export function Chip({ tone, className, children, ...props }: ChipProps) {
  return (
    <span className={cn(chipVariants({ tone }), className)} {...props}>
      {children}
    </span>
  );
}
