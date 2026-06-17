'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Wrench, ClipboardList, type LucideIcon } from 'lucide-react';
import { fmt, cn } from '@/lib/utils';

interface OperationsData {
  openPoCount: number;
  equipmentInRepairCount: number;
  todayIncompleteTasks: number;
}

function StatBox({
  icon: Icon, label, value, onClick,
}: {
  icon: LucideIcon; label: string; value: number; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-white border border-stone-200 rounded-lg px-4 py-3 text-right hover:border-stone-300 transition-colors"
    >
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={12} strokeWidth={1.5} className="text-stone-400" />
        <span className="text-[10.5px] text-stone-500 truncate">{label}</span>
      </div>
      <div className={cn('text-[16px] font-medium tabular-nums', value > 0 ? 'text-amber-700' : 'text-stone-900')}>
        {fmt(value)}
      </div>
    </button>
  );
}

/**
 * OperationsStrip — سه کارت کوچک برای میانبر به PO باز/تجهیزات در تعمیر/وظایف
 * امروزِ ناتمام، روی داشبورد (فاز ۷). داده از همان aggregate سبک
 * `/api/dashboard/overview` (فیلد operations) می‌آید.
 */
export function OperationsStrip() {
  const router = useRouter();
  const [data, setData] = useState<OperationsData | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/dashboard/overview', { credentials: 'include', cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => { if (!cancelled && json?.operations) setData(json.operations); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!data) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <StatBox icon={ShoppingCart} label="سفارش خرید باز" value={data.openPoCount} onClick={() => router.push('/purchase-orders')} />
      <StatBox icon={Wrench} label="تجهیزات در تعمیر" value={data.equipmentInRepairCount} onClick={() => router.push('/equipment')} />
      <StatBox icon={ClipboardList} label="وظایف امروزِ ناتمام" value={data.todayIncompleteTasks} onClick={() => router.push('/tasks')} />
    </div>
  );
}
