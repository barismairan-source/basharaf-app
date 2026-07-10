'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock, AlertTriangle, ShoppingCart, Wrench,
  ClipboardList, ShieldAlert, CheckCircle2,
  type LucideIcon,
} from 'lucide-react';
import { fmt } from '@/lib/utils';
import { useAppStore } from '@/store';
import { canAccessSection } from '@/lib/auth/permissions';
import { DashCard } from './DashCard';

interface OverviewData {
  inventory: { lowStockCount: number; };
  finance: { pendingTransactions: number; };
  operations: { openPoCount: number; equipmentInRepairCount: number; todayIncompleteTasks: number; };
}
interface AnomalyCounts { high: number; }

interface AttentionItem {
  id: string;
  icon: LucideIcon;
  iconClass: string;
  text: string;
  href: string;
  priority: number;
  mobileHide?: boolean;
}

/**
 * AttentionWidget — ویجت «نیازمند توجه شما».
 *
 * یافته‌ها از /api/dashboard/overview و /api/anomaly/findings/counts را جمع می‌کند
 * و به‌صورت یک لیست اولویت‌بندی‌شده (حداکثر ۵ آیتم) نشان می‌دهد.
 * جایگزین OperationsStrip (۳ کارت جدا) و بخش‌های مالی/انبار UnifiedOverview.
 *
 * موبایل: آیتم‌های ۴ و ۵ با hidden sm:flex مخفی می‌شوند تا فضای داشبورد کوتاه‌تر شود.
 */
export function AttentionWidget() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [anomaly, setAnomaly] = useState<AnomalyCounts | null>(null);
  const [loading, setLoading] = useState(true);

  const canSeeAnomaly = canAccessSection(user, 'anomaly');

  useEffect(() => {
    let cancelled = false;

    const p1 = fetch('/api/dashboard/overview', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((d: OverviewData | null) => { if (!cancelled && d) setOverview(d); })
      .catch(() => {});

    const p2 = canSeeAnomaly
      ? fetch('/api/anomaly/findings/counts', { credentials: 'include', cache: 'no-store' })
          .then((r) => r.ok ? r.json() : null)
          .then((d: AnomalyCounts | null) => { if (!cancelled && d) setAnomaly(d); })
          .catch(() => {})
      : Promise.resolve();

    Promise.all([p1, p2]).finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [canSeeAnomaly]);

  if (loading) {
    return <div className="h-[100px] rounded-xl bg-stone-100 animate-pulse" />;
  }

  const items: AttentionItem[] = [];

  if (canSeeAnomaly && anomaly && anomaly.high > 0) {
    items.push({
      id: 'anomaly',
      icon: ShieldAlert,
      iconClass: 'bg-rose-50 text-rose-600',
      text: `${fmt(anomaly.high)} یافته با شدت بالا در دستیار مالی`,
      href: '/anomaly',
      priority: 1,
    });
  }

  if (overview?.finance.pendingTransactions) {
    items.push({
      id: 'pending-tx',
      icon: Clock,
      iconClass: 'bg-amber-50 text-amber-600',
      text: `${fmt(overview.finance.pendingTransactions)} تراکنش در انتظار تأیید`,
      href: '/transactions',
      priority: 2,
    });
  }

  if (overview?.inventory.lowStockCount) {
    items.push({
      id: 'low-stock',
      icon: AlertTriangle,
      iconClass: 'bg-amber-50 text-amber-600',
      text: `${fmt(overview.inventory.lowStockCount)} قلم زیر حداقل موجودی`,
      href: '/inventory',
      priority: 3,
    });
  }

  if (overview?.operations.openPoCount) {
    items.push({
      id: 'open-po',
      icon: ShoppingCart,
      iconClass: 'bg-stone-100 text-stone-600',
      text: `${fmt(overview.operations.openPoCount)} سفارش خرید باز`,
      href: '/purchase-orders',
      priority: 4,
      mobileHide: true,
    });
  }

  if (overview?.operations.equipmentInRepairCount) {
    items.push({
      id: 'equipment',
      icon: Wrench,
      iconClass: 'bg-stone-100 text-stone-600',
      text: `${fmt(overview.operations.equipmentInRepairCount)} تجهیزات در تعمیر`,
      href: '/equipment',
      priority: 5,
      mobileHide: true,
    });
  }

  if (overview?.operations.todayIncompleteTasks) {
    items.push({
      id: 'tasks',
      icon: ClipboardList,
      iconClass: 'bg-stone-100 text-stone-600',
      text: `${fmt(overview.operations.todayIncompleteTasks)} وظیفه‌ی امروز ناتمام`,
      href: '/tasks',
      priority: 6,
      mobileHide: true,
    });
  }

  const sorted = items.sort((a, b) => a.priority - b.priority).slice(0, 5);
  const urgentCount = sorted.filter((i) => i.priority <= 3).length;

  // وقتی هیچ آیتمی نیست: نوار باریک سبز به‌جای کارت کامل
  if (sorted.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 h-10 rounded-lg bg-emerald-50 border border-emerald-100 text-[12.5px] text-emerald-700">
        <CheckCircle2 size={14} strokeWidth={1.75} className="shrink-0" />
        <span>همه‌چیز مرتب است — موردی نیاز به توجه ندارد.</span>
      </div>
    );
  }

  return (
    <DashCard
      title="نیازمند توجه شما"
      badge={urgentCount}
      badgeClass="bg-rose-100 text-rose-700"
      bodyClass="py-2"
    >
      <ul>
        {sorted.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.id} className={item.mobileHide ? 'hidden sm:block' : undefined}>
              <button
                type="button"
                onClick={() => router.push(item.href)}
                className="w-full flex items-center gap-3 py-2 px-1 rounded-lg hover:bg-stone-50/80 transition-colors text-right"
              >
                <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${item.iconClass}`}>
                  <Icon size={14} strokeWidth={1.75} />
                </div>
                <span className="text-[12.5px] text-stone-700 flex-1">{item.text}</span>
                <span className="text-[11px] text-stone-400 shrink-0" aria-hidden="true">←</span>
              </button>
            </li>
          );
        })}
      </ul>
    </DashCard>
  );
}
