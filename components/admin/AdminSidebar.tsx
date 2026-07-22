'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, ClipboardList, Bell, CalendarDays, ArrowRight, Menu, X } from 'lucide-react';
import { APP_VERSION } from '@/lib/version';
import { IconButton } from '@/components/ui/IconButton';

const NAV = [
  { href: '/admin', label: 'داشبورد ادمین', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: 'مدیریت کاربران', icon: Users },
  { href: '/admin/audit', label: 'لاگ ادیت', icon: ClipboardList },
  { href: '/admin/settings/notifications', label: 'قوانین اعلان', icon: Bell },
  { href: '/admin/settings/financial-periods', label: 'دوره‌های مالی', icon: CalendarDays },
];

function NavLinks({ pathname, onNavClick }: { pathname: string; onNavClick?: () => void }) {
  return (
    <>
      {NAV.map(item => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavClick}
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
    </>
  );
}

function SidebarFooter({ onNavClick }: { onNavClick?: () => void }) {
  return (
    <div className="mt-auto px-2">
      <Link
        href="/dashboard"
        onClick={onNavClick}
        className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-500 hover:text-stone-200 transition-colors"
      >
        <ArrowRight size={16} />
        بازگشت به اپ
      </Link>
      <p className="text-xs text-stone-600 text-center py-2 select-none">v{APP_VERSION}</p>
    </div>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* نوار بالای موبایل — جایگزین سایدبار ثابت زیر md */}
      <div className="md:hidden flex items-center justify-between px-3 h-14 bg-stone-900 border-b border-stone-800 flex-shrink-0">
        <IconButton icon={Menu} aria-label="باز کردن منو" size="md" dark onClick={() => setMobileOpen(true)} />
        <span className="text-xs font-bold tracking-widest text-stone-500 uppercase">Super Admin</span>
        <span className="w-9" aria-hidden />
      </div>

      {/* سایدبار دسکتاپ — بدون تغییر نسبت به قبل، فقط از md به بالا نمایش داده می‌شود */}
      <aside className="hidden md:flex h-full w-56 bg-stone-900 border-l border-stone-800 flex-col py-4 gap-1 flex-shrink-0">
        <div className="px-4 mb-4">
          <span className="text-xs font-bold tracking-widest text-stone-500 uppercase">Super Admin</span>
        </div>
        <NavLinks pathname={pathname} />
        <SidebarFooter />
      </aside>

      {/* کشوی موبایل */}
      {mobileOpen && (
        <>
          <div
            aria-hidden="true"
            onClick={() => setMobileOpen(false)}
            className="md:hidden fixed inset-0 z-40 bg-black/50"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="منوی Super Admin"
            className="md:hidden fixed inset-y-0 right-0 z-50 w-64 max-w-[80vw] bg-stone-900 border-l border-stone-800 flex flex-col py-4 gap-1"
          >
            <div className="flex items-center justify-between px-4 mb-4">
              <span className="text-xs font-bold tracking-widest text-stone-500 uppercase">Super Admin</span>
              <IconButton icon={X} aria-label="بستن منو" dark onClick={() => setMobileOpen(false)} />
            </div>
            <NavLinks pathname={pathname} onNavClick={() => setMobileOpen(false)} />
            <SidebarFooter onNavClick={() => setMobileOpen(false)} />
          </aside>
        </>
      )}
    </>
  );
}
