'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { MoreHorizontal, LogOut, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';
import { canAccessSection, sectionForPath } from '@/lib/auth/permissions';
import { Avatar, Sheet, IconButton } from '@/components/ui';
import {
  NAV_GROUPS, BOTTOM_NAV_HREFS, SETTINGS_NAV_ITEM, QUICK_ACTIONS,
  isNavItemActive, type NavItem,
} from './nav-config';

// Bottom-bar destinations — subset of NAV_GROUPS items
const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => [...g.items]);
const BOTTOM_TAB_HREFS = ['/dashboard', '/transactions', '/inventory', '/reports'];
const BOTTOM_TABS = BOTTOM_TAB_HREFS
  .map((href) => ALL_NAV_ITEMS.find((i) => i.href === href))
  .filter(Boolean) as NavItem[];

// Keep exporting for Sidebar's secondaryOnly filter
export { BOTTOM_NAV_HREFS };

function canSeeNavItem(user: ReturnType<typeof useAppStore.getState>['user'], item: NavItem): boolean {
  if (!user) return false;
  const section = sectionForPath(item.href);
  if (!section) return item.roles.includes(user.role);
  return canAccessSection(user, section);
}

// ─── More sheet ─────────────────────────────────────────────────────────────

function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const logout = useAppStore((s) => s.logout);

  if (!user) return null;

  const quickActions = QUICK_ACTIONS.filter((a) => canAccessSection(user, a.section));

  const secondaryGroups = NAV_GROUPS
    .map((group) => ({
      label: group.label,
      items: group.items.filter((item) => {
        if (BOTTOM_NAV_HREFS.has(item.href)) return false;
        return canSeeNavItem(user, item);
      }),
    }))
    .filter((g) => g.items.length > 0);

  const showSettings = canSeeNavItem(user, SETTINGS_NAV_ITEM);

  function handleLogout() {
    logout();
    onClose();
    router.replace('/login');
  }

  return (
    <Sheet open={open} onClose={onClose} title="منو">
      <div className="overflow-y-auto -mx-1 px-1" style={{ maxHeight: 'calc(100dvh - 180px)' }}>

        {/* Quick actions */}
        {quickActions.length > 0 && (
          <div className="mb-5">
            <div className="text-[10.5px] text-muted font-medium mb-2.5">اقدام سریع</div>
            <div className="grid grid-cols-3 gap-3">
              {quickActions.map((action) => {
                const Icon = action.icon as LucideIcon;
                return (
                  <Link
                    key={action.label}
                    href={action.href}
                    onClick={onClose}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border hover:bg-bg transition-colors"
                  >
                    <span className={cn('w-10 h-10 rounded-full flex items-center justify-center', action.iconClass)}>
                      <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
                    </span>
                    <span className="text-[11.5px] text-text text-center leading-snug">{action.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Secondary nav groups */}
        {secondaryGroups.length > 0 && (
          <div className="space-y-4 mb-2">
            {secondaryGroups.map((group) => (
              <div key={group.label}>
                <div className="text-[10.5px] text-muted font-medium mb-1 px-1">{group.label}</div>
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon as LucideIcon;
                    const active = isNavItemActive(item.href, pathname, item.matchPrefix);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className={cn(
                            'flex items-center gap-3 h-11 px-3 rounded-lg text-[13px] transition-colors',
                            active
                              ? 'bg-accent-subtle text-accent font-medium'
                              : 'text-stone-700 hover:bg-stone-100',
                          )}
                          aria-current={active ? 'page' : undefined}
                        >
                          <Icon size={15} strokeWidth={active ? 2 : 1.5} aria-hidden="true" className="flex-shrink-0" />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Settings */}
        {showSettings && (
          <div className="pt-2 pb-2 border-t border-border">
            <Link
              href={SETTINGS_NAV_ITEM.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 h-11 px-3 rounded-lg text-[13px] transition-colors',
                isNavItemActive(SETTINGS_NAV_ITEM.href, pathname)
                  ? 'bg-accent-subtle text-accent font-medium'
                  : 'text-stone-700 hover:bg-stone-100',
              )}
            >
              <SETTINGS_NAV_ITEM.icon size={15} strokeWidth={1.5} aria-hidden="true" />
              {SETTINGS_NAV_ITEM.label}
            </Link>
          </div>
        )}

        {/* User footer */}
        <div className="pt-3 border-t border-border flex items-center gap-3">
          <Avatar initials={user.initials} role={user.role} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-medium text-text truncate">{user.name}</div>
            <div className="text-[10.5px] text-muted truncate" dir="ltr">{user.email}</div>
          </div>
          <IconButton icon={LogOut} aria-label="خروج از حساب" tone="danger" onClick={handleLogout} />
        </div>
      </div>
    </Sheet>
  );
}

// ─── BottomTabBar ────────────────────────────────────────────────────────────

/**
 * BottomTabBar — mobile bottom navigation (md:hidden).
 *
 * Layout: [tab] [tab] ... [⋮ بیشتر]
 * Tabs are filtered by user role/permissions.
 * The "⋮ بیشتر" tab opens a sheet with quick actions + secondary nav + user footer,
 * replacing the old hamburger drawer in the header.
 */
export function BottomTabBar() {
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = usePathname();
  const user = useAppStore((s) => s.user);

  if (!user) return null;

  const visibleTabs = BOTTOM_TABS.filter((t) => canSeeNavItem(user, t));
  if (visibleTabs.length === 0) return null;

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-border print:hidden"
        aria-label="ناوبری پایین"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-stretch h-16">

          {/* Nav destination tabs */}
          {visibleTabs.map((tab) => {
            const active = isNavItemActive(tab.href, pathname, tab.matchPrefix);
            const Icon = tab.icon as LucideIcon;
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

          {/* ⋮ بیشتر — always last */}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label="منو — بیشتر"
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[48px] transition-colors',
              moreOpen ? 'text-accent' : 'text-stone-500 hover:text-stone-700',
            )}
          >
            <MoreHorizontal size={20} strokeWidth={1.5} aria-hidden="true" />
            <span className="text-[10px] leading-tight">بیشتر</span>
          </button>

        </div>
      </nav>

      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}
