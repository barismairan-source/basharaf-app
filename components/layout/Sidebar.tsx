'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChevronLeft, ChevronRight, ChevronDown, LogOut,
  type LucideIcon,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { BrandMark, Avatar } from '@/components/ui';
import { cn } from '@/lib/utils';
import { canAccessSection, sectionForPath } from '@/lib/auth/permissions';
import {
  NAV_GROUPS, BOTTOM_NAV_HREFS, SETTINGS_NAV_ITEM,
  isNavItemActive, type NavItem,
} from './nav-config';
import { APP_VERSION } from '@/lib/version';

function NavLink({
  item, pathname, collapsed, onNavClick,
}: {
  item: NavItem; pathname: string; collapsed: boolean; onNavClick?: () => void;
}) {
  const active = isNavItemActive(item.href, pathname, item.matchPrefix);
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
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  function toggleGroup(label: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  }

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
      const section = sectionForPath(SETTINGS_NAV_ITEM.href);
      return section ? canAccessSection(user, section) : SETTINGS_NAV_ITEM.roles.includes(user.role);
    }
    const section = sectionForPath(SETTINGS_NAV_ITEM.href);
    return section ? canAccessSection(user, section) : SETTINGS_NAV_ITEM.roles.includes(user.role);
  })();

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ─── Brand + toggle ─── */}
      <div className="flex items-center h-16 border-b border-border flex-shrink-0 relative">
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
      <nav className={cn(
        'flex-1 overflow-y-auto py-4',
        '[&::-webkit-scrollbar]:w-0 [scrollbar-width:none]',
        collapsed ? 'px-1' : 'px-3',
      )}>
        <div className="space-y-5">
          {visibleGroups.map((group) => {
            const commonItems = group.items.filter((i) => !i.rarely);
            const rareItems = group.items.filter((i) => i.rarely);
            const isExpanded = expandedGroups.has(group.label);
            const shownItems = collapsed || isExpanded
              ? group.items
              : commonItems;
            return (
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
                  {shownItems.map((item) => (
                    <NavLink
                      key={item.href}
                      item={item}
                      pathname={pathname}
                      collapsed={collapsed}
                      onNavClick={onNavClick}
                    />
                  ))}
                </ul>
                {!collapsed && rareItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.label)}
                    className="mt-0.5 flex items-center gap-1 h-8 px-3 w-full text-[11.5px] text-muted hover:text-text transition-colors"
                  >
                    <ChevronDown
                      size={12}
                      strokeWidth={2}
                      className={cn('transition-transform', isExpanded ? 'rotate-180' : '')}
                    />
                    {isExpanded ? 'کمتر' : `${rareItems.length} مورد بیشتر`}
                  </button>
                )}
              </div>
            );
          })}
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
              item={SETTINGS_NAV_ITEM}
              pathname={pathname}
              collapsed={collapsed}
              onNavClick={onNavClick}
            />
          </ul>
        </div>
      )}

      {/* ─── نسخه ─── */}
      {!collapsed && (
        <div className="px-4 pb-1 text-center">
          <span className="text-[10px] text-muted/50 select-none">v{APP_VERSION}</span>
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
        'hidden md:flex flex-shrink-0 border-l border-border bg-surface flex-col h-full print:hidden overflow-hidden',
        mounted ? 'transition-[width] duration-300 ease-in-out' : '',
        collapsed ? 'w-20' : 'w-64',
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
