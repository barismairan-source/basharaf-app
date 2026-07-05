'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChefHat, CalendarClock, ChevronLeft, Soup, TrendingDown, type LucideIcon } from 'lucide-react';
import { useAppStore } from '@/store';
import { canAccessSection } from '@/lib/auth/permissions';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';

interface KitchenCard {
  href: string;
  label: string;
  sub: string;
  icon: LucideIcon;
}

interface RawCoverage {
  itemId: string; name: string; unit: string;
  basePerUnit: number; qtyBase: number;
  dailyUse: number; coverDays: number;
  needSpan: number; shortfall: number;
}

interface ForecastResult {
  rawCoverage: RawCoverage[];
  allDayCount: number;
  horizon: number;
}

const KITCHEN_CARDS: KitchenCard[] = [
  { href: '/inventory/recipes',      label: 'دستور پخت',    sub: 'رسپی‌ها و بهای تمام‌شده',         icon: ChefHat },
  { href: '/inventory/kitchen/prep', label: 'نیمه‌آماده‌ها', sub: 'سس‌ها، خمیرها و مواد آماده‌سازی', icon: Soup },
  { href: '/inventory/plan',         label: 'برنامه تولید', sub: 'پیش‌بینی و برنامه‌ریزی پخت',      icon: CalendarClock },
];

function fmtQty(qtyBase: number, basePerUnit: number): string {
  const qty = qtyBase / (basePerUnit || 1);
  return qty >= 10 ? String(Math.round(qty)) : qty.toFixed(1).replace(/\.0$/, '');
}

export default function KitchenHubPage() {
  const user = useAppStore((s) => s.user);
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [fcLoading, setFcLoading] = useState(true);

  useEffect(() => {
    setFcLoading(true);
    fetch('/api/inventory/forecast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({}),
    })
      .then((r) => r.ok ? r.json() : null)
      .then((d: { forecast: ForecastResult } | null) => { if (d?.forecast) setForecast(d.forecast); })
      .catch(() => {})
      .finally(() => setFcLoading(false));
  }, []);

  if (!user) return null;
  if (!canAccessSection(user, 'kitchen')) {
    return <div className="p-6 text-center text-muted">دسترسی ندارید</div>;
  }

  const coverage = forecast?.rawCoverage ?? [];
  const hasCoverage = coverage.length > 0;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-2">
        <ChefHat size={20} strokeWidth={1.5} className="text-accent" />
        <h1 className="text-[17px] font-semibold text-text">آشپزخانه</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {KITCHEN_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="flex items-center gap-3 p-4 rounded-xl border border-border bg-surface hover:bg-bg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97]"
            >
              <span className="w-10 h-10 rounded-full flex items-center justify-center bg-bg flex-shrink-0">
                <Icon size={20} strokeWidth={1.5} className="text-accent" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium text-text">{card.label}</div>
                <div className="text-[11px] text-muted mt-0.5">{card.sub}</div>
              </div>
              <ChevronLeft size={16} className="text-border flex-shrink-0" />
            </Link>
          );
        })}
      </div>

      {/* ─── پیش‌بینی تقاضا ─── */}
      <Card>
        <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
          <TrendingDown size={15} strokeWidth={1.5} className="text-accent" />
          <div className="text-[13.5px] font-medium text-text">پیش‌بینی مصرف فردا</div>
          {forecast && (
            <span className="mr-auto text-[10.5px] text-muted">بر اساس {forecast.allDayCount} روز گذشته</span>
          )}
        </div>

        {fcLoading && (
          <div className="py-8 flex justify-center">
            <div className="w-5 h-5 border-2 border-border border-t-accent rounded-full animate-spin" />
          </div>
        )}

        {!fcLoading && !hasCoverage && (
          <div className="px-5 py-6 text-center text-[12px] text-muted">
            داده‌ی فروش کافی برای پیش‌بینی وجود ندارد
          </div>
        )}

        {!fcLoading && hasCoverage && (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border bg-bg">
                  <th className="text-right px-5 py-2.5 font-medium text-muted">قلم</th>
                  <th className="text-center px-3 py-2.5 font-medium text-muted whitespace-nowrap">مصرف روزانه</th>
                  <th className="text-center px-3 py-2.5 font-medium text-muted whitespace-nowrap">موجودی فعلی</th>
                  <th className="text-center px-3 py-2.5 font-medium text-muted whitespace-nowrap">کمبود احتمالی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {coverage.map((row) => (
                  <tr key={row.itemId} className={cn(row.shortfall > 0 && 'bg-danger-subtle/30')}>
                    <td className="px-5 py-3 text-text">{row.name}</td>
                    <td className="px-3 py-3 text-center text-muted tabular-nums">
                      {fmtQty(row.dailyUse, row.basePerUnit)} {row.unit}
                    </td>
                    <td className="px-3 py-3 text-center tabular-nums text-text">
                      {fmtQty(row.qtyBase, row.basePerUnit)} {row.unit}
                    </td>
                    <td className={cn('px-3 py-3 text-center tabular-nums font-medium', row.shortfall > 0 ? 'text-danger' : 'text-ok')}>
                      {row.shortfall > 0
                        ? `${fmtQty(row.shortfall, row.basePerUnit)} ${row.unit}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
