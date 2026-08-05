'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, UserPlus, Users, Clock, Calculator } from 'lucide-react';
import { Select } from '@/components/ui';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import { HrBranchFilterProvider, useHrBranchFilter } from '@/lib/hr/branchFilterContext';

const HR_NAV = [
  { href: '/hr', label: 'نمای کلی', icon: LayoutDashboard },
  { href: '/hr/recruitment', label: 'استخدام', icon: UserPlus },
  { href: '/hr/people', label: 'افراد', icon: Users },
  { href: '/hr/time', label: 'زمان و حضور', icon: Clock },
  { href: '/hr/payroll', label: 'حقوق و مزایا', icon: Calculator },
];

/**
 * فقط نوار بالای مشترک (برچسب ماژول + فیلتر شعبه + ناوبری تب‌ها) پدینگ خودش
 * را دارد؛ بدنه‌ی هر صفحه (`children`) عمداً در container دیگری نیست — چون
 * صفحات فعلی زیر /hr (که هنوز جابه‌جا شده‌اند، نه بازنویسی) خودشان container/
 * padding مستقل دارند (بعضی `PageShell`، بعضی div دستی) و پدینگ دوبرابر
 * نمی‌خواهیم. فازهای بعدی که محتوای هر صفحه را بازسازی می‌کنند، از همین
 * قرارداد (خودِ صفحه مسئول container خودش است) پیروی می‌کنند.
 */
function HrShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const user = useAppStore(s => s.user);
  const branches = useAppStore(s => s.branches);
  const { branchId, setBranchId } = useHrBranchFilter();
  const isBranchUser = user?.role === 'BranchUser';

  return (
    <div>
      <div className="px-4 lg:px-6 pt-4 lg:pt-6 pb-2">
        <div className="max-w-5xl mx-auto space-y-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="text-[11px] font-medium text-muted tracking-wide">منابع انسانی</div>
            {!isBranchUser && branches.length > 0 && (
              <Select value={branchId} onChange={e => setBranchId(e.target.value)} className="max-w-[180px]" aria-label="فیلتر شعبه">
                <option value="">— همه شعبه‌ها —</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            )}
          </div>

          <nav className="flex gap-1 border-b border-stone-200 overflow-x-auto" aria-label="ناوبری منابع انسانی">
            {HR_NAV.map(item => {
              const active = item.href === '/hr' ? pathname === '/hr' : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-1.5 px-3 h-10 text-[13px] border-b-2 -mb-px whitespace-nowrap transition-colors flex-shrink-0',
                    active ? 'border-accent text-accent font-medium' : 'border-transparent text-stone-500 hover:text-stone-800',
                  )}>
                  <Icon size={14} strokeWidth={active ? 2 : 1.5} aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {children}
    </div>
  );
}

export default function HrLayout({ children }: { children: React.ReactNode }) {
  return (
    <HrBranchFilterProvider>
      <HrShell>{children}</HrShell>
    </HrBranchFilterProvider>
  );
}
