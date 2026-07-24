'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Zap, Sparkles } from 'lucide-react';
import { formatMoneyShort } from '@/lib/design/format';
import { toFa } from '@/lib/utils';
import { getTodayJalali } from '@/lib/jalali';
import { Empty } from '@/components/ui';
import type { FlashReportData } from '@/lib/reports/flashReport';
import { computeAvgTicket, isNothingHappenedToday } from '@/lib/reports/metricSemantics';

interface Props {
  branchId?: string;
}

/** invert=true: افت = سبز (خوب)، رشد = قرمز (بد) — برای نسبت هزینه‌ی مستقیم */
function DeltaBadge({ pct, invert = false, unit = '٪' }: { pct: number | null; invert?: boolean; unit?: string }) {
  if (pct === null) return <span className="text-[10px] text-muted">—</span>;
  if (pct > 0) {
    const isGood = invert;
    return (
      <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${isGood ? 'text-emerald-700' : 'text-rose-600'}`}>
        <TrendingUp size={10} strokeWidth={2} />
        {toFa(pct)}{unit}
      </span>
    );
  }
  if (pct < 0) {
    const isGood = !invert;
    return (
      <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${isGood ? 'text-emerald-700' : 'text-rose-600'}`}>
        <TrendingDown size={10} strokeWidth={2} />
        {toFa(Math.abs(pct))}{unit}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] text-muted">
      <Minus size={10} strokeWidth={2} />
      بدون تغییر
    </span>
  );
}

function Kpi({ label, value, delta, hint }: { label: string; value: string; delta?: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-[10.5px] text-muted" title={hint}>{label}</div>
      <div className="text-[14px] font-semibold text-text num leading-none">{value}</div>
      {delta && <div className="mt-0.5">{delta}</div>}
    </div>
  );
}

function PrimeCostBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-[13px] font-semibold text-muted num">—</span>;
  const color = pct > 65 ? 'text-rose-600' : pct > 60 ? 'text-amber-600' : 'text-emerald-700';
  return <span className={`text-[14px] font-semibold num ${color}`}>{toFa(pct)}٪</span>;
}

export function FlashReportCard({ branchId }: Props) {
  const [data, setData] = useState<FlashReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    const today = getTodayJalali();
    const url = branchId
      ? `/api/reports/flash?date=${encodeURIComponent(today)}&branchId=${branchId}`
      : `/api/reports/flash?date=${encodeURIComponent(today)}`;
    fetch(url, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d: FlashReportData) => { if (!ctrl.signal.aborted) setData(d); })
      .catch(() => {})
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, [branchId]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4 animate-pulse h-24" aria-busy="true">
        <span className="sr-only">در حال بارگذاری خلاصه‌ی امروز…</span>
      </div>
    );
  }

  if (!data) return null;

  const avgTicket = computeAvgTicket(data.revenue, data.invoiceCount);

  // اگر واقعاً هیچ فعالیتی امروز نبوده، گرید صفرهای بی‌معنی نشان نده — یک حالت خالی راهنما بده
  const nothingHappenedToday = isNothingHappenedToday(data);

  if (nothingHappenedToday) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center gap-1.5 mb-1">
          <Zap size={13} strokeWidth={1.8} className="text-amber-500" />
          <span className="text-[11px] font-medium text-muted">وضعیت امروز · {data.date}</span>
        </div>
        <Empty
          icon={Sparkles}
          title="امروز هنوز فروش یا فعالیتی ثبت نشده"
          sub="با ثبت اولین فاکتور فروش، خلاصه‌ی امروز اینجا نمایش داده می‌شود."
          className="py-6"
        />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-center gap-1.5 mb-3">
        <Zap size={13} strokeWidth={1.8} className="text-amber-500" />
        <span className="text-[11px] font-medium text-muted">وضعیت امروز · {data.date}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-3">
        <Kpi
          label="فروش امروز"
          value={formatMoneyShort(data.revenue)}
          delta={<DeltaBadge pct={data.revenuePctChange} />}
        />
        <Kpi
          label="تعداد فاکتور"
          value={toFa(data.invoiceCount)}
          delta={<DeltaBadge pct={data.invoiceCountPctChange} />}
        />
        <Kpi
          label="میانگین هر فاکتور"
          value={avgTicket !== null ? formatMoneyShort(avgTicket) : '—'}
        />
        <Kpi
          label="بهای تمام‌شده"
          hint="COGS — برآورد بر اساس دسته‌بندی هزینه"
          value={formatMoneyShort(data.cogs)}
          delta={<DeltaBadge pct={data.cogsPctChange} />}
        />
        <div className="flex flex-col gap-0.5">
          <div className="text-[10.5px] text-muted" title="Prime Cost — نسبت (بهای تمام‌شده + حقوق) به فروش">نسبت هزینه مستقیم</div>
          <PrimeCostBadge pct={data.primeCostPct} />
          <div className="mt-0.5">
            <DeltaBadge pct={data.primeCostPctChange} invert unit=" پوینت" />
          </div>
        </div>
        <Kpi
          label="ضایعات"
          value={formatMoneyShort(data.wasteTotal)}
        />
      </div>
    </div>
  );
}
