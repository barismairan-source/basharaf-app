import * as React from 'react';
import { Info, CheckCircle2, AlertTriangle, XCircle, X, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconButton } from './IconButton';

export type InlineNoticeTone = 'info' | 'success' | 'warning' | 'danger';

/** export شده برای تست واحد بدون رندر — نگاشت tone→role/aria-live/آیکن باید پایدار بماند. */
export const INLINE_NOTICE_TONE_CONFIG: Record<InlineNoticeTone, { icon: LucideIcon; box: string; icon_: string; role: 'status' | 'alert'; live: 'polite' | 'assertive' }> = {
  info:    { icon: Info,          box: 'bg-accent-subtle border-accent/20',  icon_: 'text-accent',  role: 'status', live: 'polite' },
  success: { icon: CheckCircle2,  box: 'bg-ok-subtle border-ok/20',          icon_: 'text-ok',      role: 'status', live: 'polite' },
  warning: { icon: AlertTriangle, box: 'bg-warn-subtle border-warn/20',      icon_: 'text-warn',    role: 'alert',  live: 'assertive' },
  danger:  { icon: XCircle,       box: 'bg-danger-subtle border-danger/20',  icon_: 'text-danger',  role: 'alert',  live: 'assertive' },
};

export interface InlineNoticeProps {
  tone?: InlineNoticeTone;
  title?: React.ReactNode;
  children: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

/**
 * InlineNotice — بنر پیام درون‌صفحه‌ای (خطای اعتبارسنجی، هشدار، اطلاع‌رسانی).
 *
 * تفاوت با Toast: Toast شناور و گذراست (خودکار محو می‌شود)؛ InlineNotice
 * بخشی از چیدمان صفحه/فرم است و تا وقتی کاربر آن را نبندد یا شرطش برطرف
 * نشود، می‌ماند — برای پیام‌های اعتبارسنجی فرم یا وضعیت داده که کاربر باید
 * قبل از ادامه ببیندش.
 *
 * هرگز فقط با رنگ پیام نمی‌دهد — هر tone آیکن مجزا هم دارد (Info/Check/
 * Triangle/X)، برای کاربرانی که رنگ را تشخیص نمی‌دهند.
 *
 * `warning`/`danger` → role="alert" + aria-live="assertive" (باید فوراً
 * اعلام شود)؛ `info`/`success` → role="status" + aria-live="polite" —
 * همان قرارداد Toast در این پروژه.
 *
 * استفاده:
 *   <InlineNotice tone="danger" title="خطا">حداقل یک قلم معتبر وارد کنید.</InlineNotice>
 *   <InlineNotice tone="info">این شعبه هنوز تاریخ افتتاح ثبت‌نشده دارد.</InlineNotice>
 */
export function InlineNotice({ tone = 'info', title, children, onDismiss, className }: InlineNoticeProps) {
  const config = INLINE_NOTICE_TONE_CONFIG[tone];
  const Icon = config.icon;

  return (
    <div
      role={config.role}
      aria-live={config.live}
      className={cn('flex items-start gap-2.5 rounded-lg border px-3.5 py-3', config.box, className)}
    >
      <Icon size={16} strokeWidth={1.5} className={cn('shrink-0 mt-0.5', config.icon_)} aria-hidden="true" />
      <div className="min-w-0 flex-1 text-[12px] leading-5">
        {title && <div className={cn('font-medium mb-0.5', config.icon_)}>{title}</div>}
        <div className="text-text/90">{children}</div>
      </div>
      {onDismiss && (
        <IconButton icon={X} aria-label="بستن پیام" size="xs" onClick={onDismiss} className="shrink-0 -mt-0.5 -ml-0.5" />
      )}
    </div>
  );
}
