'use client';

import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { SidebarContent } from './Sidebar';

/**
 * MobileMenu — drawer ناوبری ثانویه برای موبایل (md:hidden).
 *
 * فقط مقصدهایی نشان می‌دهد که در BottomTabBar نیستند
 * (صندوق‌ها، طرف‌حساب‌ها، سفارش‌های بیرون‌بر، تجهیزات، سفارش خرید،
 * وظایف، مشتریان، مدیریت منو، تنظیمات).
 */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      {/* Hamburger — فقط موبایل */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="باز کردن منو"
        className="md:hidden w-10 h-10 flex items-center justify-center rounded-md text-muted hover:bg-bg transition-colors"
      >
        <Menu size={20} strokeWidth={1.5} />
      </button>

      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/40 md:hidden transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer — از راست (RTL start) */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 w-72 bg-surface shadow-modal md:hidden',
          'transform transition-transform duration-300 ease-out print:hidden',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        aria-modal="true"
        role="dialog"
        aria-label="منوی ناوبری"
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="بستن منو"
          className="absolute top-3 left-3 w-9 h-9 flex items-center justify-center rounded-md text-muted hover:bg-bg z-10 transition-colors"
        >
          <X size={18} strokeWidth={1.5} />
        </button>

        {/* فقط مقصدهای ثانوی (bottom nav را حذف می‌کند) */}
        <SidebarContent
          collapsed={false}
          showToggle={false}
          secondaryOnly
          onNavClick={() => setOpen(false)}
        />
      </div>
    </>
  );
}

