'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Receipt, Package, BarChart3, Settings as SettingsIcon,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';
import { canAccessSection } from '@/lib/auth/permissions';
import type { SectionKey } from '@/lib/auth/permissions';

interface TabItem {
  href: string;
  label: string;
  icon: LucideIcon;
  section: SectionKey;
  matchPrefix?: boolean;
}

const TABS: ReadonlyArray<TabItem> = [
  { href: '/dashboard',    label: 'داشبورد',   icon: LayoutDashboard, section: 'dashboard' },
  { href: '/transactions', label: 'تراکنش‌ها', icon: Receipt,          section: 'transactions', matchPrefix: true },
  { href: '/inventory',    label: 'انبار',      icon: Package,          section: 'inventory' },
  { href: '/reports',      label: 'گزارش',      icon: BarChart3,        section: 'reports' },
  { href: '/settings',     label: 'تنظیمات',    icon: SettingsIcon,     section: 'settings' },
];

function isTabActive(tab: TabItem, pathname: string): boolean {
  if (tab.matchPrefix) return pathname.startsWith(tab.href);
  return pathname === tab.href || pathname.startsWith(tab.href + '/');
}

/**
 * Bottom tab bar — فقط موبایل (lg:hidden).
 * ۵ بخش پرکاربرد را با آیکون + برچسب نمایش می‌دهد.
 * فقط بخش‌هایی که کاربر به آن‌ها دسترسی دارد نمایش می‌یابند.
 */
export function BottomTabBar() {
  const pathname = usePathname();
  const user = useAppStore((s) => s.user);

  const visibleTabs = TABS.filter((tab) => {
    if (!user) return false;
    return canAccessSection(user, tab.section);
  });

  if (visibleTabs.length === 0) return null;

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-stone-200 print:hidden"
      aria-label="ناوبری پایین"
    >
      <div className="flex items-stretch h-16">
        {visibleTabs.map((tab) => {
          const active = isTabActive(tab, pathname);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[48px] transition-colors',
                active
                  ? 'text-stone-900'
                  : 'text-stone-400 hover:text-stone-600',
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon
                size={20}
                strokeWidth={active ? 2 : 1.5}
                className={cn(
                  'transition-transform',
                  active && 'scale-110',
                )}
                aria-hidden="true"
              />
              <span className="text-[10px] leading-tight font-medium">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
