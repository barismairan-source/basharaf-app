'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, ClipboardList, Bell, CalendarDays, ArrowRight } from 'lucide-react';
import { APP_VERSION } from '@/lib/version';

const NAV = [
  { href: '/admin', label: 'داشبورد ادمین', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: 'مدیریت کاربران', icon: Users },
  { href: '/admin/audit', label: 'لاگ ادیت', icon: ClipboardList },
  { href: '/admin/settings/notifications', label: 'قوانین اعلان', icon: Bell },
  { href: '/admin/settings/financial-periods', label: 'دوره‌های مالی', icon: CalendarDays },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="h-full w-56 bg-stone-900 border-l border-stone-800 flex flex-col py-4 gap-1 flex-shrink-0">
      <div className="px-4 mb-4">
        <span className="text-xs font-bold tracking-widest text-stone-500 uppercase">Super Admin</span>
      </div>
      {NAV.map(item => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg mx-2 transition-colors ${
              active
                ? 'bg-indigo-600 text-white font-medium'
                : 'text-stone-400 hover:bg-stone-800 hover:text-stone-100'
            }`}
          >
            <item.icon size={16} />
            {item.label}
          </Link>
        );
      })}
      <div className="mt-auto px-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-500 hover:text-stone-200 transition-colors"
        >
          <ArrowRight size={16} />
          بازگشت به اپ
        </Link>
        <p className="text-xs text-stone-600 text-center py-2 select-none">v{APP_VERSION}</p>
      </div>
    </aside>
  );
}
