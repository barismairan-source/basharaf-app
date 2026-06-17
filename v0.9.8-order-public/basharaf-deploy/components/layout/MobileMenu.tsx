'use client';

import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { SidebarContent } from './Sidebar';

/**
 * MobileMenu — off-canvas drawer navigation برای موبایل.
 *
 * - دکمه hamburger در header (فقط < lg)
 * - کلیک → drawer از راست باز می‌شود (RTL — سمت start)
 * - کلیک روی overlay یا هر لینک → بسته می‌شود
 * - با route change بسته می‌شود
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
      {/* Hamburger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="باز کردن منو"
        className="lg:hidden w-10 h-10 flex items-center justify-center rounded-md text-stone-600 hover:bg-stone-50 transition-colors"
      >
        <Menu size={20} strokeWidth={1.5} />
      </button>

      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-stone-900/40 lg:hidden transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer — slides in from right (RTL start side) */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 w-72 bg-white shadow-2xl lg:hidden',
          'transform transition-transform duration-300 ease-out print:hidden',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        aria-modal="true"
        role="dialog"
        aria-label="منوی ناوبری"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="بستن منو"
          className="absolute top-3 left-3 w-9 h-9 flex items-center justify-center rounded-md text-stone-500 hover:bg-stone-50 z-10 transition-colors"
        >
          <X size={18} strokeWidth={1.5} />
        </button>

        {/* Full sidebar content — no collapse toggle in mobile drawer */}
        <SidebarContent
          collapsed={false}
          showToggle={false}
          onNavClick={() => setOpen(false)}
        />
      </div>
    </>
  );
}

