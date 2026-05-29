'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Receipt, Plus, BarChart3,
  Landmark, Users, UtensilsCrossed, Settings as SettingsIcon, type LucideIcon,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { BrandMark } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: ReadonlyArray<UserRole>;
  matchPrefix?: boolean;
}

const NAV_ALL: ReadonlyArray<NavItem> = [
  { href: '/dashboard', label: 'داشبورد', icon: LayoutDashboard, roles: ['SuperAdmin', 'BranchUser'] },
  { href: '/transactions', label: 'تراکنش‌ها', icon: Receipt, roles: ['SuperAdmin', 'BranchUser'], matchPrefix: true },
  { href: '/transactions/new', label: 'ثبت تراکنش', icon: Plus, roles: ['SuperAdmin', 'BranchUser'] },
  { href: '/accounts', label: 'صندوق‌ها', icon: Landmark, roles: ['SuperAdmin', 'BranchUser'] },
  { href: '/contacts', label: 'طرف‌حساب‌ها', icon: Users, roles: ['SuperAdmin', 'BranchUser'] },
  { href: '/reports', label: 'گزارش مالی', icon: BarChart3, roles: ['SuperAdmin', 'BranchUser'] },
  { href: '/menu', label: 'مدیریت منو', icon: UtensilsCrossed, roles: ['SuperAdmin'] },
  {
    href: '/settings', label: 'تنظیمات', icon: SettingsIcon,
    roles: ['SuperAdmin', 'BranchUser'],
  },
];

function isActive(item: NavItem, pathname: string): boolean {
  if (item.matchPrefix) {
    if (item.href === '/transactions') return pathname === '/transactions';
    return pathname.startsWith(item.href);
  }
  if (item.href === '/transactions/new') return pathname === '/transactions/new';
  return pathname === item.href;
}

interface SidebarContentProps {
  onNavClick?: () => void;
}

export function SidebarContent({ onNavClick }: SidebarContentProps) {
  const pathname = usePathname();
  const user = useAppStore(s => s.user);

  const visible = NAV_ALL.filter(item =>
    !user || item.roles.includes(user.role)
  );

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 h-14 border-b border-stone-100 flex-shrink-0">
        <BrandMark size={28} />
        <div>
          <div className="text-[13.5px] font-medium text-stone-900 leading-tight">با شرف</div>
          <div className="text-[10px] text-stone-400 leading-tight">حسابداری شعب</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <ul className="space-y-0.5">
          {visible.map(item => {
            const active = isActive(item, pathname);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavClick}
                  className={cn(
                    'flex items-center gap-2.5 h-10 px-3 rounded-md text-[13px] transition-colors',
                    active
                      ? 'bg-stone-900 text-white'
                      : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                  )}
                >
                  <Icon size={15} strokeWidth={1.5} aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User */}
      {user && (
        <div className="px-4 py-3 border-t border-stone-100 flex-shrink-0">
          <div className="text-[11.5px] text-stone-700 font-medium truncate">{user.name}</div>
          <div className="text-[10.5px] text-stone-400 truncate" dir="ltr">{user.email}</div>
        </div>
      )}
    </div>
  );
}

/** Desktop sidebar — hidden on mobile */
export function Sidebar() {
  return (
    <aside className="hidden lg:flex w-60 flex-shrink-0 border-l border-stone-200 bg-white flex-col h-screen sticky top-0 print:hidden">
      <SidebarContent />
    </aside>
  );
}
