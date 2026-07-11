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
import { BarChart2 } from 'lucide-react';
import { DashCard } from './DashCard';
import { formatMoneyShort } from '@/lib/design/format';
import { fmt } from '@/lib/utils';

interface TrendDay {
  date: string;
  income: number;
  expense: number;
}

interface Props {
  branchId?: string;
}

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

export function TrendChart({ branchId }: Props) {
  const [days, setDays] = useState<TrendDay[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = branchId
      ? `/api/dashboard/trends?branchId=${branchId}`
      : '/api/dashboard/trends';

    fetch(url, { credentials: 'include', cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((d: { days: TrendDay[] } | null) => { if (d) setDays(d.days); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [branchId]);

  if (loading) return <div className="h-[180px] rounded-xl bg-stone-100 animate-pulse" />;

  // قانون فاز ۱: کمتر از ۳ روز داده → نمایش نده
  const activeDays = days?.filter((d) => d.income > 0 || d.expense > 0) ?? [];
  if (activeDays.length < 3) return null;

  const chartData = days!.map((d) => ({
    label: shortDate(d.date),
    fullDate: d.date,
    income: d.income,
    expense: d.expense,
  }));

  // محور Y: فرمت کوتاه فارسی
  const yFormatter = (v: number) => {
    if (v === 0) return '۰';
    if (v >= 1_000_000_000) return `${fmt(Math.round(v / 1_000_000_000))}م`;
    if (v >= 1_000_000) return `${fmt(Math.round(v / 1_000_000))}م`;
    if (v >= 1_000) return `${fmt(Math.round(v / 1_000))}ه`;
    return fmt(v);
  };

  return (
    <DashCard
      title="روند ۱۴ روزه"
      icon={BarChart2}
      iconBg="bg-sky-50"
      iconColor="text-sky-600"
      bodyClass="px-2 pb-4 pt-2"
    >
      <div dir="ltr">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart
            data={chartData}
            barGap={2}
            margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
          >
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
      {/* legend دستی فارسی */}
      <div className="flex items-center justify-center gap-5 mt-1 text-[11px] text-stone-500" dir="rtl">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shrink-0" />
          درآمد
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 shrink-0" />
          هزینه
        </span>
      </div>
    </DashCard>
  );
}
