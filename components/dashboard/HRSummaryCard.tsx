'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
import { Card, CardBody, Chip, Empty } from '@/components/ui';
import { fmt } from '@/lib/utils';
import { useAppStore } from '@/store';
import { canAccessSection } from '@/lib/auth/permissions';

const PAYROLL_STATUS_LABELS: Record<string, string> = {
  draft: 'پیش‌نویس',
  calculated: 'محاسبه‌شده',
  approved: 'تأییدشده',
  posted: 'ثبت‌شده',
};

interface HRData {
  hr: {
    activeEmployees: number;
    latestPayrollRun: {
      periodYearMonth: string;
      status: string;
      branchName: string | null;
    } | null;
  };
}

/**
 * HRSummaryCard — خلاصه‌ی وضعیت پرسنل و حقوق در لایه ۳ داشبورد.
 * داده از /api/dashboard/overview می‌آید (همان endpoint که AttentionWidget هم استفاده می‌کند).
 */
export function HRSummaryCard() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const [data, setData] = useState<HRData | null>(null);

  const canSeeHr = canAccessSection(user, 'payroll') || canAccessSection(user, 'employees');

  useEffect(() => {
    if (!canSeeHr) return;
    let cancelled = false;
    fetch('/api/dashboard/overview', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((d: HRData | null) => { if (!cancelled && d) setData(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [canSeeHr]);

  if (!canSeeHr || !data) return null;

  const { hr } = data;

  return (
    <Card
      className="cursor-pointer hover:border-stone-300 transition-colors"
      onClick={() => router.push('/payroll')}
    >
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-stone-100">
        <div className="w-7 h-7 rounded-md flex items-center justify-center bg-sky-50 text-sky-600 shrink-0">
          <Users size={14} strokeWidth={1.75} />
        </div>
        <span className="text-[13px] font-medium text-stone-800">پرسنل و حقوق</span>
      </div>
      <CardBody>
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
      </CardBody>
    </Card>
  );
}
