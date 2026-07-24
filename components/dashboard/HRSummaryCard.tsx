'use client';

import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
import { Chip, Empty } from '@/components/ui';
import { DashCard } from './DashCard';
import { fmt } from '@/lib/utils';
import { useAppStore } from '@/store';
import { canAccessSection } from '@/lib/auth/permissions';
import type { DashboardOverviewData } from './overviewTypes';

const PAYROLL_STATUS_LABELS: Record<string, string> = {
  draft: 'پیش‌نویس',
  calculated: 'محاسبه‌شده',
  approved: 'تأییدشده',
  posted: 'ثبت‌شده',
};

interface Props {
  overview: DashboardOverviewData | null;
  overviewLoading: boolean;
}

/**
 * HRSummaryCard — خلاصه‌ی وضعیت پرسنل و حقوق.
 * `overview` را از صفحه‌ی داشبورد به‌عنوان prop می‌گیرد — همان
 * `/api/dashboard/overview` که AttentionWidget/OperationalQueues هم
 * استفاده می‌کنند، یک‌بار fetch می‌شود، نه هرکدام جدا.
 */
export function HRSummaryCard({ overview, overviewLoading }: Props) {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const canSeeHr = canAccessSection(user, 'payroll') || canAccessSection(user, 'employees');

  if (!canSeeHr) return null;
  if (overviewLoading) {
    return <div className="h-[100px] rounded-xl bg-stone-100 animate-pulse" aria-busy="true"><span className="sr-only">در حال بارگذاری وضعیت پرسنل…</span></div>;
  }
  if (!overview) return null;

  const { hr } = overview;

  // ۰ پرسنل فعال → یک خط باریک با لینک به /employees
  if (hr.activeEmployees === 0) {
    return (
      <button
        type="button"
        onClick={() => router.push('/employees')}
        className="w-full flex items-center gap-2 px-4 h-10 rounded-lg border border-stone-200 text-[12.5px] text-stone-500 hover:border-stone-300 transition-colors text-right"
      >
        <Users size={13} strokeWidth={1.75} className="text-stone-400 shrink-0" />
        <span className="flex-1">هنوز پرسنل فعالی ثبت نشده</span>
        <span className="text-[11px] text-stone-400 shrink-0">افزودن ←</span>
      </button>
    );
  }

  return (
    <DashCard
      title="پرسنل و حقوق"
      icon={Users}
      iconBg="bg-sky-50"
      iconColor="text-sky-600"
      bodyClass="p-0"
    >
      {/* button به‌جای div+onClick — قبلاً فقط با ماوس قابل‌فعال‌سازی بود */}
      <button
        type="button"
        onClick={() => router.push('/payroll')}
        className="w-full text-right p-5 hover:bg-stone-50/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-inset"
      >
        <div className="flex items-center justify-between text-[12px] mb-3">
          <span className="text-stone-500">پرسنل فعال</span>
          <span className="tabular-nums text-stone-800 font-medium">{fmt(hr.activeEmployees)} نفر</span>
        </div>
        <div className="pt-3 border-t border-stone-100">
          {hr.latestPayrollRun ? (
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[11px] text-stone-400 mb-0.5">آخرین دوره‌ی حقوق</div>
                <span className="text-[12px] text-stone-800">
                  {hr.latestPayrollRun.periodYearMonth}
                  {hr.latestPayrollRun.branchName ? ` · ${hr.latestPayrollRun.branchName}` : ''}
                </span>
              </div>
              <Chip tone={hr.latestPayrollRun.status === 'posted' ? 'green' : 'neutral'}>
                {PAYROLL_STATUS_LABELS[hr.latestPayrollRun.status] ?? hr.latestPayrollRun.status}
              </Chip>
            </div>
          ) : (
            <Empty icon={Users} title="هنوز دوره‌ای ثبت نشده" sub="" />
          )}
        </div>
      </button>
    </DashCard>
  );
}
