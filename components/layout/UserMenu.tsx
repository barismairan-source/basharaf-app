'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Settings as SettingsIcon, ChevronDown } from 'lucide-react';
import { useAppStore } from '@/store';
import { Avatar } from '@/components/ui';
import { can } from '@/lib/rbac';

/**
 * UserMenu — dropdown کاربر در سمت start (راست در RTL) header.
 *
 * شامل:
 * - حرف‌های اول + نام + ایمیل
 * - لینک به تنظیمات (پروفایل)
 * - دکمه خروج
 *
 * دسترس‌پذیری:
 * - دکمه باز/بسته‌کردن `aria-haspopup` و `aria-expanded` دارد
 * - Escape منو را می‌بندد
 */
export function UserMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const user = useAppStore((s) => s.user);
  const logout = useAppStore((s) => s.logout);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  if (!user) return null;

  function handleLogout() {
    logout();
    setOpen(false);
    router.replace('/login');
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 h-9 ps-1 pe-2.5 rounded-md hover:bg-stone-50 transition-colors"
      >
        <Avatar initials={user.initials} role={user.role} size="md" />
        <span className="hidden md:inline text-[12.5px] text-stone-700 max-w-[120px] truncate">
          {user.name}
        </span>
        <ChevronDown
          size={12}
          strokeWidth={1.5}
          className="text-muted hidden md:block"
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute end-0 top-11 w-64 bg-white border border-stone-200 rounded-md shadow-dropdown z-50 animate-fade-in overflow-hidden"
        >
          {/* User info */}
          <div className="px-4 py-3 border-b border-stone-100">
            <div className="text-[13px] text-stone-800 truncate">
              {user.name}
            </div>
            <div className="text-[11px] text-muted mt-0.5 truncate" dir="ltr">
              {user.email}
            </div>
            <div className="mt-2 inline-flex items-center text-[10.5px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
              {user.role === 'SuperAdmin' ? 'مدیر کل' : 'کاربر شعبه'}
            </div>
          </div>

          {/* Settings link */}
          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="w-full px-4 py-2.5 flex items-center gap-3 text-[12.5px] text-stone-700 hover:bg-stone-50 transition-colors"
          >
            <SettingsIcon size={14} strokeWidth={1.5} aria-hidden="true" />
            تنظیمات
          </Link>

          {/* Divider */}
          <div className="h-px bg-stone-100" />

          {/* Logout */}
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="w-full px-4 py-2.5 flex items-center gap-3 text-[12.5px] text-stone-700 hover:bg-rose-50 hover:text-rose-700 transition-colors"
          >
            <LogOut size={14} strokeWidth={1.5} aria-hidden="true" />
            خروج از حساب
          </button>
        </div>
      )}
    </div>
  );
}

/** Helper export شده برای جلوگیری از import خاموش `can` در فاز بعد */
export { can };
