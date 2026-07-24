'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock, AlertTriangle, ShoppingCart, Wrench,
  ClipboardList, ShieldAlert, CheckCircle2, Users,
  type LucideIcon,
} from 'lucide-react';
import { fmt } from '@/lib/utils';
import { useAppStore } from '@/store';
import { canAccessSection } from '@/lib/auth/permissions';
import { DashCard } from './DashCard';
import { Chip } from '@/components/ui';
import type { DashboardOverviewData } from './overviewTypes';

interface AnomalyCounts { high: number; }

type Group = 'financial' | 'inventory' | 'operations' | 'people';
type Severity = 'critical' | 'warning' | 'info';

const SEVERITY_LABEL: Record<Severity, string> = { critical: 'بحرانی', warning: 'هشدار', info: 'اطلاع' };
const SEVERITY_TONE: Record<Severity, 'red' | 'amber' | 'neutral'> = { critical: 'red', warning: 'amber', info: 'neutral' };
const GROUP_LABEL: Record<Group, string> = { financial: 'مالی', inventory: 'انبار', operations: 'عملیات', people: 'پرسنل' };

interface AttentionItem {
  id: string;
  icon: LucideIcon;
  iconClass: string;
  group: Group;
  severity: Severity;
  text: string;
  href: string;
  priority: number;
  mobileHide?: boolean;
}

interface Props {
  overview: DashboardOverviewData | null;
  overviewLoading: boolean;
}

/**
 * AttentionWidget — ویجت «نیازمند توجه شما».
 *
 * `overview` را از صفحه‌ی داشبورد به‌عنوان prop می‌گیرد (نه fetch مستقل) —
 * همان `/api/dashboard/overview` که HRSummaryCard و OperationalQueues هم
 * استفاده می‌کنند، یک‌بار در سطح صفحه fetch می‌شود. فقط anomaly (که جای
 * دیگری استفاده نمی‌شود) همچنان اینجا و مستقل fetch می‌شود.
 *
 * هر آیتم گروه (مالی/انبار/عملیات/پرسنل) + شدت را با متن (نه فقط رنگ
 * پس‌زمینه‌ی آیکن) نشان می‌دهد.
 *
 * موبایل: آیتم‌های ۴ و ۵ با hidden sm:flex مخفی می‌شوند تا فضای داشبورد کوتاه‌تر شود.
 */
export function AttentionWidget({ overview, overviewLoading }: Props) {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const [anomaly, setAnomaly] = useState<AnomalyCounts | null>(null);
  const [anomalyLoading, setAnomalyLoading] = useState(true);

  const canSeeAnomaly = canAccessSection(user, 'anomaly');

  useEffect(() => {
    if (!canSeeAnomaly) { setAnomalyLoading(false); return; }
    let cancelled = false;
    fetch('/api/anomaly/findings/counts', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((d: AnomalyCounts | null) => { if (!cancelled && d) setAnomaly(d); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setAnomalyLoading(false); });
    return () => { cancelled = true; };
  }, [canSeeAnomaly]);

  const loading = overviewLoading || anomalyLoading;

  if (loading) {
    return <div className="h-[100px] rounded-xl bg-stone-100 animate-pulse" aria-busy="true"><span className="sr-only">در حال بررسی موارد نیازمند توجه…</span></div>;
  }

  const items: AttentionItem[] = [];

  if (canSeeAnomaly && anomaly && anomaly.high > 0) {
    items.push({
      id: 'anomaly', icon: ShieldAlert, iconClass: 'bg-rose-50 text-rose-600',
      group: 'financial', severity: 'critical',
      text: `${fmt(anomaly.high)} یافته با شدت بالا در دستیار مالی`,
      href: '/anomaly', priority: 1,
    });
  }

  if (overview?.finance.pendingTransactions) {
    items.push({
      id: 'pending-tx', icon: Clock, iconClass: 'bg-amber-50 text-amber-600',
      group: 'financial', severity: 'warning',
      text: `${fmt(overview.finance.pendingTransactions)} تراکنش در انتظار تأیید`,
      href: '/transactions?status=pending', priority: 2,
    });
  }

  if (overview?.inventory.lowStockCount) {
    items.push({
      id: 'low-stock', icon: AlertTriangle, iconClass: 'bg-amber-50 text-amber-600',
      group: 'inventory', severity: 'warning',
      text: `${fmt(overview.inventory.lowStockCount)} قلم زیر حداقل موجودی`,
      href: '/inventory/exceptions', priority: 3,
    });
  }

  // پرسنل: دوره‌ی حقوق «محاسبه‌شده» یعنی آماده‌ی بررسی/تأیید است — یک اقدام معلق، نه صرفاً اطلاع
  if (overview?.hr.latestPayrollRun?.status === 'calculated') {
    items.push({
      id: 'payroll-review', icon: Users, iconClass: 'bg-sky-50 text-sky-600',
      group: 'people', severity: 'info',
      text: `دوره‌ی حقوق ${overview.hr.latestPayrollRun.periodYearMonth} محاسبه شده و منتظر بررسی است`,
      href: '/payroll', priority: 4,
    });
  }

  if (overview?.operations.openPoCount) {
    items.push({
      id: 'open-po', icon: ShoppingCart, iconClass: 'bg-stone-100 text-stone-600',
      group: 'operations', severity: 'info',
      text: `${fmt(overview.operations.openPoCount)} سفارش خرید باز`,
      href: '/purchase-orders', priority: 5, mobileHide: true,
    });
  }

  if (overview?.operations.equipmentInRepairCount) {
    items.push({
      id: 'equipment', icon: Wrench, iconClass: 'bg-stone-100 text-stone-600',
      group: 'operations', severity: 'info',
      text: `${fmt(overview.operations.equipmentInRepairCount)} تجهیزات در تعمیر`,
      href: '/equipment', priority: 6, mobileHide: true,
    });
  }

  if (overview?.operations.todayIncompleteTasks) {
    items.push({
      id: 'tasks', icon: ClipboardList, iconClass: 'bg-stone-100 text-stone-600',
      group: 'operations', severity: 'info',
      text: `${fmt(overview.operations.todayIncompleteTasks)} وظیفه‌ی امروز ناتمام`,
      href: '/tasks', priority: 7, mobileHide: true,
    });
  }

  const sorted = items.sort((a, b) => a.priority - b.priority).slice(0, 5);
  const urgentCount = sorted.filter((i) => i.severity === 'critical' || i.severity === 'warning').length;

  // وقتی هیچ آیتمی نیست: نوار باریک سبز به‌جای کارت کامل — بدون فضای خالی رزروشده
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
                <div className="flex-1 min-w-0">
                  <span className="text-[12.5px] text-stone-700 block truncate">{item.text}</span>
                  <span className="text-[10px] text-stone-400">{GROUP_LABEL[item.group]}</span>
                </div>
                {/* شدت با متن، نه فقط رنگ پس‌زمینه‌ی آیکن */}
                <Chip tone={SEVERITY_TONE[item.severity]} className="shrink-0">
                  {SEVERITY_LABEL[item.severity]}
                </Chip>
                <span className="text-[11px] text-stone-400 shrink-0" aria-hidden="true">←</span>
              </button>
            </li>
          );
        })}
      </ul>
    </DashCard>
  );
}
