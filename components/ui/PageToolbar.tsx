import * as React from 'react';
import { cn } from '@/lib/utils';

export interface PageToolbarProps {
  title: React.ReactNode;
  sub?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * PageToolbar — هدر سطح صفحه برای صفحات اصلی (Dashboard، Transactions، Reports)
 * که — برخلاف PageHeader — دکمه‌ی بازگشت ندارند؛ فقط عنوان + زیرعنوان اختیاری
 * + اکشن‌ها.
 *
 * چرا جدا از PageHeader؟ PageHeader همیشه یک دکمه‌ی بازگشت رندر می‌کند —
 * مناسب صفحات فرعی/جزئیات. صفحات سطح-بالا نیازی به آن ندارند؛ این الگو
 * («عنوان راست، اکشن‌ها چپ، در موبایل ستونی») در گزارش مالی و استخدام
 * دستی تکرار شده بود.
 *
 * موبایل: عنوان و اکشن‌ها زیر هم؛ از sm به بالا: کنار هم.
 *
 * استفاده:
 *   <PageToolbar
 *     title="تراکنش‌ها"
 *     sub="۱۲۴ مورد"
 *     actions={<PageToolbar.Actions><Button icon={Plus}>جدید</Button></PageToolbar.Actions>}
 *   />
 */
export function PageToolbar({ title, sub, actions, className }: PageToolbarProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4', className)}>
      <div className="min-w-0">
        <h1 className="text-[20px] font-medium tracking-tight text-text truncate">{title}</h1>
        {sub && <div className="text-[12px] text-muted mt-1">{sub}</div>}
      </div>
      {actions && <PageToolbar.Actions>{actions}</PageToolbar.Actions>}
    </div>
  );
}

/** ردیف اکشن‌ها — در موبایل grid دو‌ستونه (لمسی، بدون overflow)، از sm به بالا flex-wrap. */
PageToolbar.Actions = function PageToolbarActions({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center', className)}>
      {children}
    </div>
  );
};
