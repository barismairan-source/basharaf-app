'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Receipt, BarChart3,
  Landmark, Users, UtensilsCrossed, ScrollText, Briefcase, Calculator,
  Package, UserPlus, Settings as SettingsIcon, UserCircle, Ticket,
  CalendarClock, ChevronLeft, ChevronRight, LogOut, Wrench, ShoppingCart,
  ClipboardList, Truck,
  type LucideIcon,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { BrandMark, Avatar } from '@/components/ui';
import { cn } from '@/lib/utils';
import { canAccessSection, sectionForPath } from '@/lib/auth/permissions';
import type { UserRole } from '@/types';
import { BOTTOM_NAV_HREFS } from './BottomTabBar';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: ReadonlyArray<UserRole>;
  matchPrefix?: boolean;
}

interface NavGroup {
  label: string;
  items: ReadonlyArray<NavItem>;
}

const NAV_GROUPS: ReadonlyArray<NavGroup> = [
  {
    label: 'عملیات اصلی',
    items: [
      { href: '/dashboard',     label: 'داشبورد',           icon: LayoutDashboard, roles: ['SuperAdmin', 'BranchUser'] },
      { href: '/transactions',  label: 'تراکنش‌ها',          icon: Receipt,         roles: ['SuperAdmin', 'BranchUser'], matchPrefix: true },
      { href: '/orders',        label: 'سفارش‌های بیرون‌بر', icon: Truck,           roles: ['SuperAdmin', 'BranchUser'], matchPrefix: true },
      { href: '/accounts',      label: 'صندوق‌ها',           icon: Landmark,        roles: ['SuperAdmin', 'BranchUser'] },
      { href: '/contacts',      label: 'طرف‌حساب‌ها',        icon: Users,           roles: ['SuperAdmin', 'BranchUser'] },
    ],
  },
  {
    label: 'پشت صحنه',
    items: [
      { href: '/inventory',       label: 'انبار و آشپزخانه', icon: Package,         roles: ['SuperAdmin', 'Warehouse'] },
      { href: '/menu',            label: 'مدیریت منو',        icon: UtensilsCrossed, roles: ['SuperAdmin'] },
      { href: '/equipment',       label: 'تجهیزات',           icon: Wrench,          roles: ['SuperAdmin', 'BranchUser'], matchPrefix: true },
      { href: '/purchase-orders', label: 'سفارش خرید',        icon: ShoppingCart,    roles: ['SuperAdmin', 'BranchUser'], matchPrefix: true },
      { href: '/tasks',           label: 'وظایف روزانه',      icon: ClipboardList,   roles: ['SuperAdmin', 'BranchUser', 'Warehouse'] },
    ],
  },
  {
    label: 'روابط و منابع',
    items: [
      { href: '/customers',    label: 'امور مشتریان',  icon: UserCircle,    roles: ['SuperAdmin', 'BranchUser'], matchPrefix: true },
      { href: '/reservations', label: 'رزرو میز',      icon: CalendarClock, roles: ['SuperAdmin', 'BranchUser'] },
      { href: '/coupons',      label: 'کوپن‌ها',        icon: Ticket,        roles: ['SuperAdmin'] },
      { href: '/employees',    label: 'پرسنل',          icon: Briefcase,     roles: ['SuperAdmin'] },
      { href: '/payroll',      label: 'حقوق و دستمزد', icon: Calculator,    roles: ['SuperAdmin'] },
      { href: '/recruitment',  label: 'استخدام',        icon: UserPlus,      roles: ['SuperAdmin'] },
    ],
  },
  {
    label: 'تحلیل و گزارش',
    items: [
      { href: '/reports', label: 'گزارش‌ها',  icon: BarChart3,  roles: ['SuperAdmin', 'BranchUser'] },
      { href: '/logs',    label: 'لاگ سیستم', icon: ScrollText, roles: ['SuperAdmin'] },
    ],
  },
];

const SETTINGS_ITEM: NavItem = {
  href: '/settings', label: 'تنظیمات', icon: SettingsIcon,
  roles: ['SuperAdmin', 'BranchUser'],
};

function isActive(item: NavItem, pathname: string): boolean {
  if (item.matchPrefix) {
    if (item.href === '/transactions')
      return pathname === '/transactions' || pathname === '/transactions/new' || pathname.startsWith('/transactions/');
    return pathname.startsWith(item.href);
  }
  return pathname === item.href;
}

function NavLink({
  item, pathname, collapsed, onNavClick,
}: {
  item: NavItem; pathname: string; collapsed: boolean; onNavClick?: () => void;
}) {
  const active = isActive(item, pathname);
  const Icon = item.icon;
  return (
    <li>
      <Link
        href={item.href}
        onClick={onNavClick}
        title={collapsed ? item.label : undefined}
        className={cn(
          'flex items-center rounded-md text-[13px] transition-colors',
          collapsed
            ? 'h-10 w-10 justify-center mx-auto'
            : 'h-10 gap-2.5 px-3',
          active
            ? 'bg-accent-subtle text-accent font-medium'
            : 'text-stone-700 hover:bg-stone-100 hover:text-stone-900',
        )}
        aria-current={active ? 'page' : undefined}
      >
        <Icon
          size={15}
          strokeWidth={active ? 2 : 1.5}
          aria-hidden="true"
          className="flex-shrink-0"
        />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    </li>
  );
}

export interface SidebarContentProps {
  collapsed?: boolean;
  onNavClick?: () => void;
  onToggle?: () => void;
  showToggle?: boolean;
  /**
   * اگر true، مقصدهای نوار پایین موبایل (dashboard/transactions/inventory/reports)
   * از منو حذف می‌شوند — برای drawer موبایل که فقط secondary nav را نشان می‌دهد.
   */
  secondaryOnly?: boolean;
}

export function SidebarContent({
  collapsed = false,
  onNavClick,
  onToggle,
  showToggle = false,
  secondaryOnly = false,
}: SidebarContentProps) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const logout = useAppStore((s) => s.logout);

  const canSee = (item: NavItem): boolean => {
    if (!user) return false;
    if (secondaryOnly && BOTTOM_NAV_HREFS.has(item.href)) return false;
    const section = sectionForPath(item.href);
    if (!section) return item.roles.includes(user.role);
    return canAccessSection(user, section);
  };

  const visibleGroups = NAV_GROUPS
    .map((group) => ({ label: group.label, items: group.items.filter(canSee) }))
    .filter((group) => group.items.length > 0);

  const showSettings = (() => {
    if (!user) return false;
    if (secondaryOnly) {
      // settings همیشه در secondary nav نشان داده می‌شود
      const section = sectionForPath(SETTINGS_ITEM.href);
      return section ? canAccessSection(user, section) : SETTINGS_ITEM.roles.includes(user.role);
    }
    const section = sectionForPath(SETTINGS_ITEM.href);
    return section ? canAccessSection(user, section) : SETTINGS_ITEM.roles.includes(user.role);
  })();

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ─── Brand + toggle ─── */}
      <div className="flex items-center h-14 border-b border-border flex-shrink-0 relative">
        {collapsed ? (
          <div className="flex-1 flex justify-center">
            <BrandMark size={24} />
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-5">
            <BrandMark size={28} />
            <div>
              <div className="text-[13.5px] font-medium text-text leading-tight">با شرف</div>
              <div className="text-[10px] text-muted leading-tight">حسابداری شعب</div>
            </div>
          </div>
        )}

        {showToggle && onToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? 'باز کردن سایدبار' : 'بستن سایدبار'}
            className="absolute left-2 flex items-center justify-center w-6 h-6 rounded-md text-muted hover:text-text hover:bg-bg transition-colors"
          >
            {collapsed
              ? <ChevronLeft size={14} strokeWidth={2} />
              : <ChevronRight size={14} strokeWidth={2} />
            }
          </button>
        )}
      </div>

      {/* ─── Navigation ─── */}
      <nav className={cn('flex-1 overflow-y-auto py-4', collapsed ? 'px-1' : 'px-3')}>
        <div className="space-y-5">
          {visibleGroups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <div className="px-3 mb-1.5 text-[10.5px] font-medium text-muted tracking-wide select-none">
                  {group.label}
                </div>
              )}
              {collapsed && (
                <div className="h-px bg-border mx-2 mb-2" />
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    collapsed={collapsed}
                    onNavClick={onNavClick}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      {/* ─── تنظیمات — پین‌شده بالای footer ─── */}
      {showSettings && (
        <div className={cn(
          'pt-3 pb-1 border-t border-border flex-shrink-0',
          collapsed ? 'px-1' : 'px-3',
        )}>
          <ul>
            <NavLink
              item={SETTINGS_ITEM}
              pathname={pathname}
              collapsed={collapsed}
              onNavClick={onNavClick}
            />
          </ul>
        </div>
      )}

      {/* ─── کاربر footer ─── */}
      {user && (
        <div className={cn(
          'border-t border-border flex-shrink-0',
          collapsed ? 'px-1 py-2' : 'px-4 py-3',
        )}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-1.5">
              <Avatar initials={user.initials} role={user.role} size="sm" />
              <button
                type="button"
                onClick={handleLogout}
                title="خروج از حساب"
                className="w-8 h-8 flex items-center justify-center rounded-md text-muted hover:text-danger hover:bg-danger-subtle transition-colors"
              >
                <LogOut size={14} strokeWidth={1.5} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Avatar initials={user.initials} role={user.role} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="text-[11.5px] text-text font-medium truncate">{user.name}</div>
                <div className="text-[10.5px] text-muted truncate" dir="ltr">{user.email}</div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="خروج از حساب"
                className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-muted hover:text-danger hover:bg-danger-subtle transition-colors"
              >
                <LogOut size={14} strokeWidth={1.5} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Sidebar — دسکتاپ (md+)، با قابلیت collapse.
 */
export function Sidebar() {
  const preferences = useAppStore((s) => s.preferences);
  const updatePreference = useAppStore((s) => s.updatePreference);
  const collapsed = preferences.sidebarCollapsed;

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  function toggle() {
    updatePreference('sidebarCollapsed', !collapsed);
  }

  return (
    <aside
      className={cn(
        'hidden md:flex flex-shrink-0 border-l border-border bg-surface flex-col h-screen sticky top-0 print:hidden overflow-hidden',
        mounted ? 'transition-[width] duration-200 ease-in-out' : '',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <SidebarContent
        collapsed={collapsed}
        onToggle={toggle}
        showToggle
      />
    </aside>
  );
}
