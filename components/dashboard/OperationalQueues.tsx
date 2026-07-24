'use client';

import { useRouter } from 'next/navigation';
import {
  Clock, PackageSearch, AlertTriangle, ShoppingCart, Wrench, ClipboardList,
  type LucideIcon,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { canAccessSection } from '@/lib/auth/permissions';
import { MetricGrid } from '@/components/ui';
import { fmt } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { DashboardOverviewData } from './overviewTypes';

interface QueueDef {
  id: string;
  icon: LucideIcon;
  label: string;
  count: number;
  href: string;
  visible: boolean;
}

interface Props {
  overview: DashboardOverviewData | null;
  overviewLoading: boolean;
}

/**
 * OperationalQueues — «کدام صف‌های عملیاتی مسدود است؟».
 *
 * همه‌ی صف‌ها همیشه نمایش داده می‌شوند (حتی صفر — یعنی آن صف خالی/سالم
 * است، خبر خوبی که نباید پنهان شود)؛ برخلاف AttentionWidget که فقط
 * موارد غیرصفر و اولویت‌دار را نشان می‌دهد. هر صف به مقصد فیلترشده‌ی
 * خودش لینک می‌شود.
 *
 * `overview` را از صفحه‌ی داشبورد به‌عنوان prop می‌گیرد — همان
 * `/api/dashboard/overview` که AttentionWidget/HRSummaryCard هم استفاده
 * می‌کنند، یک‌بار fetch می‌شود.
 */
export function OperationalQueues({ overview, overviewLoading }: Props) {
  const router = useRouter();
  const user = useAppStore((s) => s.user);

  const canFinance = canAccessSection(user, 'transactions');
  const canInventory = canAccessSection(user, 'inventory');

  if (overviewLoading) {
    return (
      <div aria-busy="true">
        <span className="sr-only">در حال بارگذاری صف‌های عملیاتی…</span>
        <MetricGrid minCardWidth={160}>
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 rounded-lg bg-bg animate-pulse border border-border" />)}
        </MetricGrid>
      </div>
    );
  }

  if (!overview) return null;

  const queues: QueueDef[] = [
    { id: 'pending-tx', icon: Clock, label: 'تراکنش‌های در انتظار', count: overview.finance.pendingTransactions, href: '/transactions?status=pending', visible: canFinance },
    { id: 'pending-vouchers', icon: ClipboardList, label: 'برگه‌های انبار در انتظار', count: overview.inventory.pendingVouchers, href: '/inventory/cartable', visible: canInventory },
    { id: 'low-stock', icon: AlertTriangle, label: 'اقلام زیر حداقل موجودی', count: overview.inventory.lowStockCount, href: '/inventory/exceptions', visible: canInventory },
    { id: 'open-po', icon: ShoppingCart, label: 'سفارش‌های خرید باز', count: overview.operations.openPoCount, href: '/purchase-orders', visible: canInventory },
    { id: 'equipment', icon: Wrench, label: 'تجهیزات در تعمیر', count: overview.operations.equipmentInRepairCount, href: '/equipment', visible: canInventory },
    { id: 'tasks', icon: PackageSearch, label: 'وظایف امروزِ ناتمام', count: overview.operations.todayIncompleteTasks, href: '/tasks', visible: true },
  ].filter((q) => q.visible);

  if (queues.length === 0) return null;

  return (
    <MetricGrid minCardWidth={160}>
      {queues.map((q) => {
        const Icon = q.icon;
        const isEmpty = q.count === 0;
        return (
          <button
            key={q.id}
            type="button"
            onClick={() => router.push(q.href)}
            className={cn(
              'flex items-center gap-3 p-3.5 rounded-lg border text-right transition-colors',
              isEmpty
                ? 'bg-surface border-border hover:border-stone-300'
                : 'bg-amber-50/60 border-amber-100 hover:border-amber-200'
            )}
          >
            <div className={cn(
              'w-8 h-8 rounded-md flex items-center justify-center shrink-0',
              isEmpty ? 'bg-bg text-muted' : 'bg-white text-amber-600'
            )}>
              <Icon size={15} strokeWidth={1.75} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <div className={cn('text-[16px] font-semibold tabular-nums leading-none', isEmpty ? 'text-stone-400' : 'text-amber-700')}>
                {fmt(q.count)}
              </div>
              <div className="text-[11px] text-muted mt-1 truncate">{q.label}</div>
            </div>
          </button>
        );
      })}
    </MetricGrid>
  );
}
