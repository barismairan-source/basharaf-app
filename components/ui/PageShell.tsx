import * as React from 'react';
import { cn } from '@/lib/utils';

const MAX_WIDTH = {
  /** فرم تک‌ستونه (ثبت تراکنش، ویرایش رکورد) — عرض محدود برای خوانایی، نه چیدمان جدول */
  form: 'max-w-2xl',
  /** صفحه‌ی جزئیات با چند بخش/کارت (جزئیات شریک، جزئیات مشتری) */
  detail: 'max-w-4xl',
  /** صفحات داده‌محور (لیست/جدول/گزارش) — می‌تواند از فضای صفحه‌ی عریض (۱۴۴۰–۱۹۲۰px) واقعاً استفاده کند */
  data: 'max-w-[1600px]',
} as const;

export interface PageShellProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * نوع صفحه — عرض حداکثر را تعیین می‌کند:
   * - form:   ۴۲rem (۶۷۲px) — فرم‌های تک‌ستونه
   * - detail: ۵۶rem (۸۹۶px) — صفحات جزئیات چندبخشی
   * - data:   ۱۰۰rem (۱۶۰۰px) — لیست/جدول/گزارش (تا نصف صفحه در ۱۹۲۰px خالی نماند)
   */
  type?: keyof typeof MAX_WIDTH;
  children: React.ReactNode;
}

/**
 * PageShell — container استاندارد سطح صفحه.
 *
 * الگویی که این کامپوننت جایگزینش می‌کند، تقریباً در هر صفحه با عرض
 * حداکثر متفاوت (max-w-3xl تا max-w-6xl، بدون قاعده‌ی مشخص) تکرار شده بود —
 * که در صفحه‌نمایش‌های عریض (۱۴۴۰–۱۹۲۰px) هم برای صفحات فرم فضای خالی
 * زیادی می‌گذاشت و هم صفحات داده‌محور را کم‌عرض‌تر از لازم نگه می‌داشت.
 *
 * `type` این تصمیم را یک‌جا و آگاهانه می‌گیرد؛ padding/vertical rhythm با
 * className قابل override است.
 *
 * استفاده:
 *   <PageShell type="data" className="space-y-6">...</PageShell>
 *   <PageShell type="form" className="space-y-4">...</PageShell>
 */
export function PageShell({ type = 'detail', className, children, ...props }: PageShellProps) {
  return (
    <div
      className={cn(MAX_WIDTH[type], 'mx-auto p-4 md:p-6 space-y-6', className)}
      {...props}
    >
      {children}
    </div>
  );
}
