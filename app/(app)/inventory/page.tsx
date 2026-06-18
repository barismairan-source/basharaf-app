'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  PackageOpen, ClipboardCheck, TrendingDown, AlertTriangle,
  ChefHat, BarChart2, CalendarClock, Package, ChevronLeft,
  type LucideIcon,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui';

interface ExceptionsData {
  stalePending: { count: number };
  clampWarnings: { count: number };
  belowMin: { count: number; items: Array<{ name: string }> };
  pendingReversals: { count: number };
}

interface ActionCard {
  href: string;
  label: string;
  sub: string;
  icon: LucideIcon;
  accent?: boolean;
  danger?: boolean;
  badge?: number | null;
}

interface MoreAction {
  href: string;
  label: string;
  sub: string;
  icon: LucideIcon;
}

const MORE_ACTIONS: MoreAction[] = [
  { href: '/inventory/items',    label: 'اقلام انبار',      sub: 'مدیریت کالاها و مواد اولیه',   icon: Package },
  { href: '/inventory/cartable', label: 'کارتابل برگه‌ها', sub: 'تأیید و رد برگه‌های در انتظار', icon: ClipboardCheck },
  { href: '/inventory/recipes',  label: 'دستور پخت',        sub: 'رکوردهای آشپزخانه',            icon: ChefHat },
  { href: '/inventory/variance', label: 'گزارش مغایرت',    sub: 'اختلاف تئوری و واقعی',         icon: BarChart2 },
  { href: '/inventory/plan',     label: 'برنامه تولید',     sub: 'پیش‌بینی و برنامه‌ریزی',       icon: CalendarClock },
];

export default function InventoryPage() {
  const user = useAppStore((s) => s.user);
  const branches = useAppStore((s) => s.branches);

  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [exceptions, setExceptions] = useState<ExceptionsData | null>(null);
  const [excLoading, setExcLoading] = useState(false);

  // For non-SuperAdmin, branch is fixed to assignedBranch
  const effectiveBranchId = (() => {
    if (!user) return '';
    if (user.role !== 'SuperAdmin') return user.assignedBranch ?? '';
    return selectedBranchId;
  })();

  // Initialise branch selector for SuperAdmin
  useEffect(() => {
    if (!selectedBranchId && branches.length > 0 && branches[0]) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId]);

  // Fetch exceptions whenever effective branch changes
  useEffect(() => {
    if (!effectiveBranchId) return;
    setExcLoading(true);
    fetch(`/api/inventory/reports/exceptions?branchId=${effectiveBranchId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: ExceptionsData | null) => { if (data?.stalePending) setExceptions(data); })
      .catch(() => {})
      .finally(() => setExcLoading(false));
  }, [effectiveBranchId]);

  if (!user) return null;
  if (
    user.role !== 'SuperAdmin' &&
    user.role !== 'Warehouse' &&
    user.role !== 'BranchUser'
  ) {
    return <div className="p-6 text-center text-muted">دسترسی ندارید</div>;
  }

  const totalAlerts = exceptions
    ? exceptions.stalePending.count +
      exceptions.clampWarnings.count +
      exceptions.belowMin.count +
      exceptions.pendingReversals.count
    : 0;

  const ACTION_CARDS: ActionCard[] = [
    {
      href: '/inventory/receive',
      label: 'دریافت بار',
      sub: 'ثبت رسید خرید',
      icon: PackageOpen,
      accent: true,
    },
    {
      href: '/inventory/stocktake',
      label: 'انبارگردانی',
      sub: 'شمارش و تطبیق موجودی',
      icon: ClipboardCheck,
    },
    {
      href: '/inventory/sales',
      label: 'ثبت فروش',
      sub: 'کسر مصرف از موجودی',
      icon: TrendingDown,
    },
    {
      href: '/inventory/exceptions',
      label: 'هشدارها',
      sub: totalAlerts > 0 ? `${totalAlerts} مورد نیاز به بررسی` : 'بدون هشدار',
      icon: AlertTriangle,
      badge: totalAlerts > 0 ? totalAlerts : null,
      danger: totalAlerts > 0,
    },
  ];

  const statusItems = exceptions
    ? [
        { label: 'برگه‌های معلق',  count: exceptions.stalePending.count,   warn: exceptions.stalePending.count > 0 },
        { label: 'کمبود موجودی',   count: exceptions.belowMin.count,        warn: exceptions.belowMin.count > 0 },
        { label: 'هشدار clamp',    count: exceptions.clampWarnings.count,   warn: exceptions.clampWarnings.count > 0 },
        { label: 'برگشت‌های معلق', count: exceptions.pendingReversals.count, warn: exceptions.pendingReversals.count > 0 },
      ]
    : [];

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">

      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <h1 className="text-[17px] font-semibold text-text">انبار و آشپزخانه</h1>
        {user.role === 'SuperAdmin' && branches.length > 1 && (
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="text-[12px] border border-border rounded-full px-3 py-1.5 bg-surface text-text focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* ─── 4 Action Cards ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {ACTION_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className={cn(
                'relative flex flex-col items-start gap-3 p-4 rounded-xl border cursor-pointer',
                'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97]',
                card.accent
                  ? 'bg-accent border-accent text-white hover:bg-blue-700'
                  : 'bg-surface border-border hover:bg-bg',
              )}
            >
              {card.badge && (
                <span className="absolute top-2.5 left-2.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-danger text-white text-[10px] font-bold">
                  {card.badge}
                </span>
              )}
              <span
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  card.accent
                    ? 'bg-white/20'
                    : card.danger
                      ? 'bg-danger-subtle'
                      : 'bg-bg',
                )}
              >
                <Icon
                  size={20}
                  strokeWidth={1.5}
                  className={
                    card.accent ? 'text-white' : card.danger ? 'text-danger' : 'text-accent'
                  }
                />
              </span>
              <div>
                <div
                  className={cn(
                    'text-[14px] font-medium',
                    card.accent ? 'text-white' : 'text-text',
                  )}
                >
                  {card.label}
                </div>
                <div
                  className={cn(
                    'text-[11px] mt-0.5',
                    card.accent ? 'text-white/70' : 'text-muted',
                  )}
                >
                  {card.sub}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ─── وضعیت امروز ─── */}
      {excLoading && !exceptions && (
        <Card>
          <div className="py-8 flex justify-center">
            <div className="w-5 h-5 border-2 border-border border-t-accent rounded-full animate-spin" />
          </div>
        </Card>
      )}

      {exceptions && (
        <Card>
          <div className="px-5 py-3.5 border-b border-border">
            <div className="text-[13.5px] font-medium text-text">وضعیت امروز</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-x-reverse divide-border">
            {statusItems.map((item) => (
              <div key={item.label} className="px-4 py-4 text-center">
                <div
                  className={cn(
                    'text-[22px] font-semibold num',
                    item.warn ? 'text-danger' : 'text-ok',
                  )}
                >
                  {item.count}
                </div>
                <div className="text-[11px] text-muted mt-0.5">{item.label}</div>
              </div>
            ))}
          </div>
          {exceptions.belowMin.count > 0 && (
            <div className="px-5 py-3 border-t border-border bg-danger-subtle">
              <p className="text-[12px] text-danger">
                <span className="font-medium">{exceptions.belowMin.count} قلم</span>
                {' زیر حداقل موجودی: '}
                {exceptions.belowMin.items.slice(0, 3).map((it) => it.name).join('، ')}
                {exceptions.belowMin.count > 3 && ' و ...'}
              </p>
            </div>
          )}
        </Card>
      )}

      {/* ─── کارهای بیشتر ─── */}
      <Card>
        <div className="px-5 py-3.5 border-b border-border">
          <div className="text-[13.5px] font-medium text-text">کارهای بیشتر</div>
        </div>
        <ul className="divide-y divide-border">
          {MORE_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <li key={action.href}>
                <Link
                  href={action.href}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-bg transition-colors"
                >
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-bg flex-shrink-0">
                    <Icon size={16} strokeWidth={1.5} className="text-muted" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-text">{action.label}</div>
                    <div className="text-[11px] text-muted mt-0.5">{action.sub}</div>
                  </div>
                  <ChevronLeft size={16} className="text-border flex-shrink-0" />
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>

    </div>
  );
}
