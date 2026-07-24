'use client';

import { RefreshCw } from 'lucide-react';
import { SegFilter, IconButton } from '@/components/ui';
import { JalaliDatePicker } from '@/components/ui/JalaliDatePicker';
import type { PeriodKey } from '@/lib/reports/periodResolve';

const PERIOD_OPTIONS: Array<{ value: PeriodKey; label: string }> = [
  { value: 'today', label: 'امروز' },
  { value: '7d', label: '۷ روز' },
  { value: '30d', label: '۳۰ روز' },
  { value: 'custom', label: 'دلخواه' },
];

export interface DashboardScopeBarProps {
  period: PeriodKey;
  onPeriodChange: (p: PeriodKey) => void;
  customFrom: string;
  customTo: string;
  onCustomFromChange: (v: string) => void;
  onCustomToChange: (v: string) => void;
  lastUpdated: Date | null;
  refreshing: boolean;
  onRefresh: () => void;
}

function formatLastUpdated(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * DashboardScopeBar — انتخاب بازه‌ی زمانی داشبورد (زیر PageToolbar).
 *
 * بازه بر کل داشبورد اثر می‌گذارد به‌جز «امروز چه گذشت» (همیشه ثابت روی
 * امروز است، چون معنای «امروز» را دارد) و «روند» (بازه‌ی خودش را جدا دارد
 * چون نمودار روزانه است، نه یک عدد تجمیعی).
 *
 * صفحه‌ی داشبورد این کامپوننت را با period/branchFilter در URL همگام
 * نگه می‌دارد (تا رفرش/اشتراک‌گذاری لینک، همان نما را حفظ کند).
 */
export function DashboardScopeBar({
  period,
  onPeriodChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
  lastUpdated,
  refreshing,
  onRefresh,
}: DashboardScopeBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <SegFilter
        value={period}
        onChange={onPeriodChange}
        aria-label="بازه‌ی زمانی داشبورد"
        options={PERIOD_OPTIONS}
      />

      {period === 'custom' && (
        <div className="flex items-center gap-1.5">
          <div className="w-32"><JalaliDatePicker value={customFrom} onChange={onCustomFromChange} placeholder="از تاریخ" /></div>
          <span className="text-muted text-[11px]">تا</span>
          <div className="w-32"><JalaliDatePicker value={customTo} onChange={onCustomToChange} placeholder="تا تاریخ" /></div>
        </div>
      )}

      <div className="flex items-center gap-2 sm:mr-auto text-[11px] text-muted">
        <span>
          آخرین به‌روزرسانی: <span className="tabular-nums">{formatLastUpdated(lastUpdated)}</span>
        </span>
        <IconButton
          icon={RefreshCw}
          aria-label="به‌روزرسانی داشبورد"
          size="sm"
          loading={refreshing}
          onClick={onRefresh}
        />
      </div>
    </div>
  );
}
