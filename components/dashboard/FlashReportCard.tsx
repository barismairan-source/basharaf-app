'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Zap } from 'lucide-react';
import { formatMoneyShort } from '@/lib/design/format';
import { toFa } from '@/lib/utils';
import { getTodayJalali } from '@/lib/jalali';
import type { FlashReportData } from '@/lib/reports/flashReport';

/** invert=true: افت = سبز (خوب)، رشد = قرمز (بد) — برای Prime Cost % */
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

function Kpi({ label, value, delta }: { label: string; value: string; delta?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-[10.5px] text-muted">{label}</div>
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

export function FlashReportCard() {
  const [data, setData] = useState<FlashReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = getTodayJalali();
    fetch(`/api/reports/flash?date=${encodeURIComponent(today)}`)
      .then((r) => r.json())
      .then((d: FlashReportData) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4 animate-pulse h-24" />
    );
  }

  if (!data) return null;

  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-center gap-1.5 mb-3">
        <Zap size={13} strokeWidth={1.8} className="text-amber-500" />
        <span className="text-[11px] font-medium text-muted">گزارش امروز · {data.date}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-3">
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
          label="COGS تخمینی"
          value={formatMoneyShort(data.cogs)}
          delta={<DeltaBadge pct={data.cogsPctChange} />}
        />
        <div className="flex flex-col gap-0.5">
          <div className="text-[10.5px] text-muted">Prime Cost %</div>
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
