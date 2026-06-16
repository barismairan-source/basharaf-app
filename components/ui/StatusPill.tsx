import * as React from 'react';
import { Chip, type ChipProps } from './Chip';

type ChipTone = NonNullable<ChipProps['tone']>;

interface StatusConfig {
  label: string;
  tone: ChipTone;
}

const STATUS_MAP: Record<string, StatusConfig> = {
  // تراکنش مالی
  approved:  { label: 'تأیید شده',    tone: 'green'   },
  pending:   { label: 'در انتظار',    tone: 'amber'   },
  rejected:  { label: 'رد شده',       tone: 'red'     },

  // پرداخت آنلاین
  paid:      { label: 'پرداخت شده',   tone: 'green'   },
  unpaid:    { label: 'پرداخت نشده',  tone: 'amber'   },
  failed:    { label: 'ناموفق',        tone: 'red'     },

  // سفارش بیرون‌بر
  received:          { label: 'دریافت شد',          tone: 'amber'   },
  confirmed:         { label: 'تأیید شد',            tone: 'green'   },
  preparing:         { label: 'در حال آماده‌سازی',  tone: 'amber'   },
  ready:             { label: 'آماده تحویل',         tone: 'green'   },
  out_for_delivery:  { label: 'ارسال شد',            tone: 'green'   },
  delivered:         { label: 'تحویل داده شد',       tone: 'green'   },
  completed:         { label: 'تکمیل شد',            tone: 'green'   },
  cancelled:         { label: 'لغو شد',              tone: 'red'     },
  pickup:            { label: 'پیکاپ',               tone: 'neutral' },

  // موجودی / انبار
  active:    { label: 'فعال',          tone: 'green'   },
  inactive:  { label: 'غیرفعال',      tone: 'neutral' },
  locked:    { label: 'قفل شده',      tone: 'neutral' },
};

export interface StatusPillProps {
  /** کلید وضعیت — اگر در نگاشت نبود، label خود status نمایش داده می‌شود */
  status: string;
  /** برچسب سفارشی (override نگاشت) */
  label?: string;
  /** رنگ سفارشی (override نگاشت) */
  tone?: ChipTone;
  className?: string;
}

/**
 * StatusPill — برچسب وضعیت رنگی برای تراکنش/سفارش/موجودی.
 * یک wrapper ساده روی Chip با نگاشت status→tone خودکار.
 *
 * نمونه استفاده:
 *   <StatusPill status="approved" />          // → Chip سبز «تأیید شده»
 *   <StatusPill status="pending" />           // → Chip زرد «در انتظار»
 *   <StatusPill status="out_for_delivery" />  // → Chip سبز «ارسال شد»
 *   <StatusPill status="custom" label="سفارشی" tone="amber" />
 */
export function StatusPill({ status, label, tone, className }: StatusPillProps) {
  const config = STATUS_MAP[status];
  const resolvedLabel = label ?? config?.label ?? status;
  const resolvedTone = tone ?? config?.tone ?? 'neutral';

  return (
    <Chip tone={resolvedTone} className={className}>
      {resolvedLabel}
    </Chip>
  );
}
