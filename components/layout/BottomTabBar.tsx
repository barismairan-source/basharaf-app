'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Receipt, Package, BarChart3,
  Plus, TrendingUp, PackageOpen,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';
import { canAccessSection } from '@/lib/auth/permissions';
import type { SectionKey } from '@/lib/auth/permissions';
import { Sheet } from '@/components/ui';

// hrefs که در bottom nav هستند — SidebarContent با secondaryOnly=true اینها را حذف می‌کند
export const BOTTOM_NAV_HREFS = new Set(['/dashboard', '/transactions', '/inventory', '/reports']);

interface TabItem {
  href: string;
  label: string;
  icon: LucideIcon;
  section: SectionKey;
  matchPrefix?: boolean;
}

interface QuickAction {
  label: string;
  icon: LucideIcon;
  href: string;
  section: SectionKey;
  iconClass: string;
}

const LEFT_TABS: TabItem[] = [
  { href: '/dashboard',    label: 'داشبورد',   icon: LayoutDashboard, section: 'dashboard' },
  { href: '/transactions', label: 'تراکنش‌ها', icon: Receipt,          section: 'transactions', matchPrefix: true },
];

const RIGHT_TABS: TabItem[] = [
  { href: '/inventory', label: 'انبار',  icon: Package,  section: 'inventory' },
  { href: '/reports',   label: 'گزارش',  icon: BarChart3, section: 'reports' },
];

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'ثبت تراکنش',
    icon: Receipt,
    href: '/transactions/new',
    section: 'transactions',
    iconClass: 'text-accent bg-accent-subtle',
  },
  {
    label: 'ثبت فروش روز',
    icon: TrendingUp,
    href: '/transactions/new',
    section: 'transactions',
    iconClass: 'text-ok bg-ok-subtle',
  },
  {
    label: 'دریافت بار',
    icon: PackageOpen,
    href: '/inventory',
    section: 'inventory',
    iconClass: 'text-warn bg-warn-subtle',
  },
];

function isActive(tab: TabItem, pathname: string): boolean {
  if (tab.matchPrefix) return pathname.startsWith(tab.href);
  return pathname === tab.href || pathname.startsWith(tab.href + '/');
}

/**
 * BottomTabBar — ناوبری پایین صفحه، فقط موبایل (md:hidden).
 * ساختار: [تب] [تب] [● + ثبت] [تب] [تب]
 * دکمه‌ی وسط Sheet اقدام‌های سریع را باز می‌کند.
 */
export function BottomTabBar() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const pathname = usePathname();
  const user = useAppStore((s) => s.user);

  if (!user) return null;

  const visible = (t: TabItem) => canAccessSection(user, t.section);
  const leftTabs  = LEFT_TABS.filter(visible);
  const rightTabs = RIGHT_TABS.filter(visible);
  const quickActions = QUICK_ACTIONS.filter((a) => canAccessSection(user, a.section));
  const showFab = quickActions.length > 0;

  if (leftTabs.length + rightTabs.length === 0 && !showFab) return null;

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-border print:hidden"
        aria-label="ناوبری پایین"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center h-16">

          {/* ─── تب‌های سمت راست (داشبورد، تراکنش‌ها) ─── */}
          {leftTabs.map((tab) => {
            const active = isActive(tab, pathname);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[48px] transition-colors',
                  active ? 'text-accent' : 'text-stone-500 hover:text-stone-700',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={20} strokeWidth={active ? 2 : 1.5} aria-hidden="true" />
                <span className="text-[10px] leading-tight">{tab.label}</span>
              </Link>
            );
          })}

          {/* ─── دکمه‌ی وسط «+ ثبت» (FAB) ─── */}
          {showFab && (
            <div className="flex-1 flex justify-center items-center">
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                aria-label="ثبت سریع"
                aria-expanded={sheetOpen}
                className={cn(
                  'w-14 h-14 rounded-full bg-accent text-white shadow-lg',
                  'flex items-center justify-center -translate-y-3',
                  'transition-transform active:scale-95 focus-visible:outline-none',
                  'focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2',
                )}
              >
                <Plus size={24} strokeWidth={2.5} aria-hidden="true" />
              </button>
            </div>
          )}

          {/* ─── تب‌های سمت چپ (انبار، گزارش) ─── */}
          {rightTabs.map((tab) => {
            const active = isActive(tab, pathname);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[48px] transition-colors',
                  active ? 'text-accent' : 'text-stone-500 hover:text-stone-700',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={20} strokeWidth={active ? 2 : 1.5} aria-hidden="true" />
                <span className="text-[10px] leading-tight">{tab.label}</span>
              </Link>
            );
          })}

        </div>
      </nav>

      {/* ─── Sheet اقدام‌های سریع ─── */}
      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="ثبت سریع"
      >
        <div className="grid grid-cols-3 gap-3 pb-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                href={action.href}
                onClick={() => setSheetOpen(false)}
                className="flex flex-col items-center gap-2.5 p-4 rounded-xl border border-border hover:bg-bg transition-colors"
              >
                <span
                  className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center',
                    action.iconClass,
                  )}
                >
                  <Icon size={22} strokeWidth={1.5} aria-hidden="true" />
                </span>
                <span className="text-[12px] text-text text-center leading-snug">
                  {action.label}
                </span>
              </Link>
            );
          })}
        </div>
      </Sheet>
    </>
  );
}
