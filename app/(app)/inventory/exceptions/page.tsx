'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCw, Clock, AlertTriangle, TrendingDown, RotateCcw } from 'lucide-react';
import { useAppStore } from '@/store';

type ExceptionsData = {
  stalePending: { count: number };
  clampWarnings: { count: number };
  belowMin: { count: number };
  pendingReversals: { count: number };
};

export default function ExceptionsPage() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const branches = useAppStore((s) => s.branches);

  const branchId = (() => {
    if (!user) return '';
    if (user.role !== 'SuperAdmin') return user.assignedBranch ?? '';
    return branches[0]?.id ?? '';
  })();

  const [data, setData] = useState<ExceptionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    if (!branchId) { setLoading(false); return; }
    try {
      const res = await fetch(`/api/inventory/reports/exceptions?branchId=${branchId}`, { credentials: 'include' });
      if (res.ok) { setData(await res.json()); setLastUpdated(new Date()); }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [branchId]);

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  if (!branchId) {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-6">
        <div className="text-center text-muted py-12 text-[13px]">شعبه‌ای انتخاب نشده</div>
      </div>
    );
  }

  const cards = data ? [
    {
      label: 'برگه‌های معلق',
      sub: 'بیش از ۳ روز در انتظار تأیید',
      count: data.stalePending.count,
      icon: Clock,
      onClick: () => router.push('/inventory/cartable'),
    },
    {
      label: 'هشدار کسر موجودی',
      sub: 'موجودی منفی شد (drift)',
      count: data.clampWarnings.count,
      icon: AlertTriangle,
      onClick: undefined,
    },
    {
      label: 'زیر حداقل موجودی',
      sub: 'نیاز به خرید',
      count: data.belowMin.count,
      icon: TrendingDown,
      onClick: data.belowMin.count > 0 ? () => router.push(`/purchase-orders?suggestBranch=${branchId}`) : undefined,
    },
    {
      label: 'اصلاحی معلق',
      sub: 'برگه اصلاحی در کارتابل',
      count: data.pendingReversals.count,
      icon: RotateCcw,
      onClick: () => router.push('/inventory/cartable'),
    },
  ] : [];

  function colorClass(n: number) {
    if (n === 0) return { badge: 'bg-ok-subtle text-ok', border: 'border-border' };
    if (n <= 3) return { badge: 'bg-warn-subtle text-warn', border: 'border-warn/30' };
    return { badge: 'bg-danger-subtle text-danger', border: 'border-danger/30' };
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[17px] font-semibold text-text">داشبورد هشدارها</h1>
        <button
          onClick={load}
          className="w-11 h-11 flex items-center justify-center text-muted hover:text-text rounded-lg"
          title="به‌روزرسانی"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
        </button>
      </div>

      {lastUpdated && (
        <div className="text-[11px] text-muted">
          آخرین به‌روزرسانی: {lastUpdated.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}

      {loading && !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-muted" size={24} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cards.map((card) => {
            const { badge, border } = colorClass(card.count);
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                onClick={card.onClick}
                className={`bg-surface border ${border} rounded-xl p-4 flex items-start gap-3 ${card.onClick ? 'cursor-pointer hover:shadow-sm transition-shadow' : ''}`}
              >
                <div className="flex-shrink-0 w-10 h-10 bg-bg rounded-lg flex items-center justify-center">
                  <Icon size={18} className="text-muted" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-medium text-text">{card.label}</span>
                    <span className={`${badge} text-[13px] font-semibold num px-2 py-0.5 rounded-full`}>
                      {card.count}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted mt-0.5">{card.sub}</div>
                  {card.onClick && card.count > 0 && (
                    <div className="text-[11px] text-accent mt-1">برو به صفحه ←</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
