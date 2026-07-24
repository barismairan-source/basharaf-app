'use client';

import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { BarChart2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { DashCard } from './DashCard';
import { SegFilter } from '@/components/ui';
import { formatMoneyShort } from '@/lib/design/format';
import { fmt, toFa } from '@/lib/utils';
import { computeChangePct } from '@/lib/reports/metricSemantics';

interface TrendDay {
  date: string;
  income: number;
  expense: number;
}

interface TrendsResponse {
  days: TrendDay[];
  previousTotal: { income: number; expense: number } | null;
}

interface Props {
  branchId?: string;
}

const CHART_HEIGHT = 180;
const DAY_OPTIONS = [
  { value: '14', label: '۱۴ روز' },
  { value: '30', label: '۳۰ روز' },
  { value: '90', label: '۹۰ روز' },
] as const;

/** تاریخ جلالی کوتاه: '۱۴۰۵/۰۴/۲۰' → '۰۴/۲۰' */
function shortDate(d: string): string {
  const p = d.split('/');
  return p.length === 3 ? `${p[1]}/${p[2]}` : d;
}

function FaTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const income = payload.find((p) => p.name === 'income');
  const expense = payload.find((p) => p.name === 'expense');
  return (
    <div className="bg-white border border-stone-200 rounded-lg shadow-md px-3 py-2.5 text-right text-[12px]" dir="rtl">
      <div className="text-stone-500 mb-1.5 font-medium">{label}</div>
      {income && (
        <div className="flex items-center gap-1.5 text-emerald-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span>درآمد: {formatMoneyShort(income.value)}</span>
        </div>
      )}
      {expense && (
        <div className="flex items-center gap-1.5 text-rose-700 mt-0.5">
          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
          <span>هزینه: {formatMoneyShort(expense.value)}</span>
        </div>
      )}
    </div>
  );
}

function ComparisonBadge({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  if (pct === 0) {
    return <span className="inline-flex items-center gap-0.5 text-[10.5px] text-muted"><Minus size={10} strokeWidth={2} />بدون تغییر</span>;
  }
  const up = pct > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10.5px] font-medium ${up ? 'text-emerald-700' : 'text-rose-600'}`}>
      {up ? <TrendingUp size={10} strokeWidth={2} /> : <TrendingDown size={10} strokeWidth={2} />}
      {toFa(Math.abs(pct))}٪ نسبت به دوره‌ی قبل
    </span>
  );
}

export function TrendChart({ branchId }: Props) {
  const [days, setDays] = useState<number>(14);
  const [data, setData] = useState<TrendsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    const params = new URLSearchParams({ days: String(days) });
    if (branchId) params.set('branchId', branchId);
    fetch(`/api/dashboard/trends?${params}`, { credentials: 'include', cache: 'no-store', signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: TrendsResponse | null) => { if (!ctrl.signal.aborted && d) setData(d); })
      .catch(() => {})
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, [branchId, days]);

  const header = (
    <SegFilter
      value={String(days)}
      onChange={(v) => setDays(Number(v))}
      aria-label="بازه‌ی نمودار روند"
      options={DAY_OPTIONS as unknown as Array<{ value: string; label: string }>}
    />
  );

  // ارتفاع ثابت در همه‌ی حالت‌ها (loading/insufficient/chart) — بدون این،
  // عبور از آستانه‌ی «داده‌ی کافی» یا لود شدن، کل کارت را جابه‌جا می‌کرد.
  if (loading) {
    return (
      <DashCard title="روند درآمد و هزینه" icon={BarChart2} iconBg="bg-sky-50" iconColor="text-sky-600" bodyClass="px-2 pb-4 pt-2">
        <div style={{ height: CHART_HEIGHT }} className="rounded-lg bg-bg animate-pulse" aria-busy="true">
          <span className="sr-only">در حال بارگذاری نمودار روند…</span>
        </div>
      </DashCard>
    );
  }

  const activeDays = data?.days.filter((d) => d.income > 0 || d.expense > 0) ?? [];
  const insufficientData = activeDays.length < 3;

  const totalIncome = (data?.days ?? []).reduce((s, d) => s + d.income, 0);
  const totalExpense = (data?.days ?? []).reduce((s, d) => s + d.expense, 0);
  const prev = data?.previousTotal ?? null;
  const netFlow = totalIncome - totalExpense;
  const prevNetFlow = prev ? prev.income - prev.expense : null;
  const netFlowChangePct = computeChangePct(netFlow, prevNetFlow);

  if (insufficientData) {
    return (
      <DashCard title="روند درآمد و هزینه" icon={BarChart2} iconBg="bg-sky-50" iconColor="text-sky-600" bodyClass="px-2 pb-4 pt-2">
        {header}
        <div style={{ height: CHART_HEIGHT }} className="flex items-center justify-center text-center px-6">
          <p className="text-[12px] text-muted leading-relaxed">
            برای رسم نمودار روند، حداقل ۳ روز با تراکنش تأییدشده لازم است.
            <br />با ثبت و تأیید تراکنش‌های بیشتر، نمودار اینجا ظاهر می‌شود.
          </p>
        </div>
      </DashCard>
    );
  }

  const chartData = data!.days.map((d) => ({
    label: shortDate(d.date),
    fullDate: d.date,
    income: d.income,
    expense: d.expense,
  }));

  const yFormatter = (v: number) => {
    if (v === 0) return '۰';
    if (v >= 1_000_000_000) return `${fmt(Math.round(v / 1_000_000_000))}م`;
    if (v >= 1_000_000) return `${fmt(Math.round(v / 1_000_000))}م`;
    if (v >= 1_000) return `${fmt(Math.round(v / 1_000))}ه`;
    return fmt(v);
  };

  return (
    <DashCard title="روند درآمد و هزینه" icon={BarChart2} iconBg="bg-sky-50" iconColor="text-sky-600" bodyClass="px-2 pb-4 pt-2">
      <div className="px-3 flex flex-wrap items-center justify-between gap-2 mb-2">
        {header}
        <ComparisonBadge pct={netFlowChangePct} />
      </div>

      <div dir="ltr">
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart data={chartData} barGap={2} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#f3f4f6" strokeDasharray="0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#9ca3af', fontFamily: 'inherit' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              orientation="right"
              tickFormatter={yFormatter}
              tick={{ fontSize: 10, fill: '#9ca3af', fontFamily: 'inherit' }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip content={<FaTooltip />} cursor={{ fill: '#f9fafb' }} />
            <Bar dataKey="income" name="income" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={20} />
            <Bar dataKey="expense" name="expense" fill="#f43f5e" radius={[3, 3, 0, 0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-center gap-5 mt-1 text-[11px] text-stone-500" dir="rtl">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shrink-0" />درآمد
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 shrink-0" />هزینه
        </span>
      </div>

      {/* fallback متنی برای screen reader — نمودار SVG به‌تنهایی برای صفحه‌خوان قابل‌فهم نیست */}
      <table className="sr-only">
        <caption>روند روزانه‌ی درآمد و هزینه، {chartData.length} روز اخیر</caption>
        <thead>
          <tr><th>تاریخ</th><th>درآمد</th><th>هزینه</th></tr>
        </thead>
        <tbody>
          {chartData.map((d) => (
            <tr key={d.fullDate}>
              <td>{d.fullDate}</td>
              <td>{fmt(d.income)} تومان</td>
              <td>{fmt(d.expense)} تومان</td>
            </tr>
          ))}
        </tbody>
      </table>
    </DashCard>
  );
}
