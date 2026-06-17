'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  PackageSearch,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Users,
  Wallet2,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardBody, Empty, Chip } from '@/components/ui';
import { fmt, cn } from '@/lib/utils';
import { useAppStore } from '@/store';
import { canAccessSection } from '@/lib/auth/permissions';

/**
 * UnifiedOverview — «داشبورد یکپارچه»
 *
 * یک نگاه ترکیبی برای مدیریت که سه حوزه‌ی جدا را کنار هم می‌گذارد:
 *   ۱. هشدار/وضعیت انبار (اقلام زیر حداقل موجودی + برگه‌های در انتظار)
 *   ۲. فعالیت مالی اخیر (آخرین تراکنش‌های تأییدشده + تعداد در انتظار)
 *   ۳. وضعیت سریع پرسنل/حقوق (تعداد پرسنل فعال + آخرین دوره‌ی حقوق)
 *
 * داده از /api/dashboard/overview می‌آید — یک aggregate سبک (نه لیست‌های کامل)
 * که خودش RBAC را اعمال می‌کند (BranchUser فقط شعبه‌ی خودش را می‌بیند).
 *
 * طراحی: کارت‌ها کلیک‌پذیرند و کاربر را به صفحه‌ی همان حوزه می‌برند —
 * این پنل خلاصه است، نه جایگزین صفحات تخصصی.
 */

interface OverviewData {
  branchId: string | null;
  inventory: {
    lowStockItems: Array<{ id: string; name: string; unit: string; qtyBase: number; minBase: number }>;
    lowStockCount: number;
    pendingVouchers: number;
  };
  finance: {
    recentTransactions: Array<{ id: string; type: string; amount: number; title: string; createdAt: string }>;
    pendingTransactions: number;
  };
  hr: {
    activeEmployees: number;
    latestPayrollRun: { id: string; periodYearMonth: string; status: string; branchName: string | null } | null;
  };
}

const PAYROLL_STATUS_LABELS: Record<string, string> = {
  draft: 'پیش‌نویس',
  calculated: 'محاسبه‌شده',
  approved: 'تأییدشده',
  posted: 'ثبت‌شده در حسابداری',
};

function SectionCard({
  icon: Icon,
  iconClass,
  title,
  badge,
  onClick,
  children,
}: {
  icon: LucideIcon;
  iconClass: string;
  title: string;
  badge?: React.ReactNode;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn(onClick && 'cursor-pointer hover:border-stone-300 transition-colors')} onClick={onClick}>
      <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-stone-100">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn('w-7 h-7 rounded-md flex items-center justify-center shrink-0', iconClass)}>
            <Icon size={14} strokeWidth={1.75} />
          </div>
          <span className="text-[13px] font-medium text-stone-800 truncate">{title}</span>
        </div>
        {badge}
      </div>
      <CardBody>{children}</CardBody>
    </Card>
  );
}

export function UnifiedOverview() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // دسترسی واقعی کاربر — هر ستون فقط در صورت دسترسی به بخش متناظر نمایش داده می‌شود
  const canSeeInventory = canAccessSection(user, 'inventory');
  const canSeeFinance = canAccessSection(user, 'transactions');
  const canSeeHr = canAccessSection(user, 'payroll') || canAccessSection(user, 'employees');
  const visibleCount = [canSeeInventory, canSeeFinance, canSeeHr].filter(Boolean).length;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetch('/api/dashboard/overview', { credentials: 'include', cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('failed');
        return res.json();
      })
      .then((json: OverviewData) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // اگر کاربر به هیچ‌کدام از سه حوزه دسترسی ندارد، اصلاً پنل را نشان نده
  if (visibleCount === 0) return null;

  const gridColsClass =
    visibleCount === 1 ? 'lg:grid-cols-1' : visibleCount === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-3';

  if (loading) {
    return (
      <div className={cn('grid grid-cols-1 gap-4', gridColsClass)}>
        {Array.from({ length: visibleCount }).map((_, i) => (
          <div key={i} className="h-[220px] rounded-xl bg-stone-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center text-[12px] text-muted py-6 border border-dashed border-stone-200 rounded-xl">
        نمایش یکپارچه در دسترس نیست — لطفاً بعداً دوباره تلاش کنید.
      </div>
    );
  }

  const { inventory, finance, hr } = data;

  return (
    <div className="space-y-2">
      <div className="text-[12px] text-stone-500">نمای یکپارچه — انبار، فروش/مالی، حقوق و پرسنل</div>
      <div className={cn('grid grid-cols-1 gap-4', gridColsClass)}>

        {/* ─── ۱) وضعیت انبار ─── */}
        {canSeeInventory && <SectionCard
          icon={PackageSearch}
          iconClass="bg-amber-50 text-amber-600"
          title="وضعیت انبار"
          onClick={() => router.push('/inventory')}
          badge={inventory.lowStockCount > 0 ? (
            <Chip tone="amber">{`${inventory.lowStockCount} هشدار`}</Chip>
          ) : (
            <Chip tone="green">موجودی سالم</Chip>
          )}
        >
          {inventory.lowStockItems.length === 0 ? (
            <Empty
              icon={PackageSearch}
              title="همه چیز خوب است"
              sub="هیچ قلمی زیر حداقل موجودی نیست."
            />
          ) : (
            <ul className="space-y-1.5">
              {inventory.lowStockItems.slice(0, 5).map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2 text-[12px]">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <AlertTriangle size={12} strokeWidth={1.75} className="text-amber-500 shrink-0" />
                    <span className="truncate text-stone-700">{item.name}</span>
                  </span>
                  <span className="tabular-nums text-stone-500 shrink-0">
                    {fmt(item.qtyBase)} / {fmt(item.minBase)} {item.unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {inventory.pendingVouchers > 0 && (
            <div className="mt-3 pt-3 border-t border-stone-100 text-[11.5px] text-stone-500">
              {fmt(inventory.pendingVouchers)} برگه‌ی انبار در انتظار تأیید
            </div>
          )}
        </SectionCard>}

        {/* ─── ۲) فعالیت مالی اخیر ─── */}
        {canSeeFinance && <SectionCard
          icon={Wallet2}
          iconClass="bg-emerald-50 text-emerald-600"
          title="فعالیت مالی اخیر"
          onClick={() => router.push('/transactions')}
          badge={finance.pendingTransactions > 0 ? (
            <Chip tone="amber">{`${finance.pendingTransactions} در انتظار`}</Chip>
          ) : undefined}
        >
          {finance.recentTransactions.length === 0 ? (
            <Empty
              icon={Wallet2}
              title="هنوز تراکنشی نیست"
              sub="آخرین فعالیت‌های مالی اینجا نمایش داده می‌شوند."
            />
          ) : (
            <ul className="space-y-1.5">
              {finance.recentTransactions.map((tx) => {
                const isIncome = tx.type === 'income';
                const Icon = isIncome ? ArrowUpRight : ArrowDownLeft;
                return (
                  <li key={tx.id} className="flex items-center justify-between gap-2 text-[12px]">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <Icon
                        size={12}
                        strokeWidth={1.75}
                        className={cn('shrink-0', isIncome ? 'text-emerald-500' : 'text-rose-500')}
                      />
                      <span className="truncate text-stone-700">{tx.title}</span>
                    </span>
                    <span className={cn('tabular-nums shrink-0', isIncome ? 'text-emerald-700' : 'text-rose-700')}>
                      {isIncome ? '+' : '−'}{fmt(tx.amount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>}

        {/* ─── ۳) وضعیت سریع پرسنل/حقوق ─── */}
        {canSeeHr && <SectionCard
          icon={Users}
          iconClass="bg-sky-50 text-sky-600"
          title="پرسنل و حقوق"
          onClick={() => router.push('/payroll')}
        >
          <div className="flex items-center justify-between text-[12px] mb-3">
            <span className="text-stone-500">پرسنل فعال</span>
            <span className="tabular-nums text-stone-800 font-medium">{fmt(hr.activeEmployees)} نفر</span>
          </div>
          <div className="pt-3 border-t border-stone-100">
            {hr.latestPayrollRun ? (
              <div className="space-y-1">
                <div className="text-[11.5px] text-stone-500">آخرین دوره‌ی حقوق</div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] text-stone-800">
                    {hr.latestPayrollRun.periodYearMonth}
                    {hr.latestPayrollRun.branchName ? ` · ${hr.latestPayrollRun.branchName}` : ''}
                  </span>
                  <Chip tone={hr.latestPayrollRun.status === 'posted' ? 'green' : 'neutral'}>
                    {PAYROLL_STATUS_LABELS[hr.latestPayrollRun.status] ?? hr.latestPayrollRun.status}
                  </Chip>
                </div>
              </div>
            ) : (
              <Empty
                icon={Users}
                title="هنوز دوره‌ی حقوقی ثبت نشده"
                sub="با ساخت اولین دوره، وضعیت آن اینجا نمایش داده می‌شود."
              />
            )}
          </div>
        </SectionCard>}
      </div>
    </div>
  );
}
