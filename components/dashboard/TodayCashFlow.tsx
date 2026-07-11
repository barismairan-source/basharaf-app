'use client';

import { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { formatMoneyShort } from '@/lib/design/format';
import { fmt } from '@/lib/utils';

interface Props {
  branchId?: string;
}

interface TodayData {
  todayIncome: number;
  todayExpense: number;
}

export function TodayCashFlow({ branchId }: Props) {
  const [data, setData] = useState<TodayData | null>(null);

  useEffect(() => {
    const url = branchId
      ? `/api/dashboard/trends?branchId=${branchId}`
      : '/api/dashboard/trends';

    fetch(url, { credentials: 'include', cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((d: TodayData | null) => { if (d) setData(d); })
      .catch(() => {});
  }, [branchId]);

  // اگر هر دو صفر باشند، نمایش نده
  if (!data || (data.todayIncome === 0 && data.todayExpense === 0)) return null;

  return (
    <div className="flex items-stretch gap-3">
      {/* ورودی امروز */}
      <div
        className="flex-1 flex items-center gap-2.5 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-100"
        title={`${fmt(data.todayIncome)} تومان`}
      >
        <div className="w-7 h-7 rounded-md flex items-center justify-center bg-white shrink-0">
          <ArrowDownLeft size={14} strokeWidth={1.75} className="text-emerald-600" />
        </div>
        <div>
          <div className="text-[10px] text-emerald-600 leading-none mb-0.5">ورودی امروز</div>
          <div className="text-[14px] font-semibold text-emerald-800 tabular-nums leading-none">
            {formatMoneyShort(data.todayIncome)}
          </div>
        </div>
      </div>

      {/* خروجی امروز */}
      <div
        className="flex-1 flex items-center gap-2.5 px-4 py-3 rounded-lg bg-rose-50 border border-rose-100"
        title={`${fmt(data.todayExpense)} تومان`}
      >
        <div className="w-7 h-7 rounded-md flex items-center justify-center bg-white shrink-0">
          <ArrowUpRight size={14} strokeWidth={1.75} className="text-rose-600" />
        </div>
        <div>
          <div className="text-[10px] text-rose-600 leading-none mb-0.5">خروجی امروز</div>
          <div className="text-[14px] font-semibold text-rose-800 tabular-nums leading-none">
            {formatMoneyShort(data.todayExpense)}
          </div>
        </div>
      </div>
    </div>
  );
}
