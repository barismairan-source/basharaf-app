'use client';

import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { SidebarContent } from './Sidebar';

/**
 * MobileMenu — drawer navigation برای موبایل.
 *
 * - دکمه hamburger در header (فقط < lg)
 * - کلیک → drawer از راست باز می‌شود (RTL)
 * - کلیک روی overlay یا هر لینک → بسته می‌شود
 * - با route change بسته می‌شود
 */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // بستن با تغییر route
  useEffect(() => { setOpen(false); }, [pathname]);

  // جلوگیری از scroll هنگام باز بودن
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      {/* Hamburger button — فقط موبایل */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="باز کردن منو"
        className="lg:hidden w-10 h-10 flex items-center justify-center rounded-md text-stone-600 hover:bg-stone-50 transition-colors"
      >
        <Menu size={20} strokeWidth={1.5} />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-stone-900/40 lg:hidden animate-fade-in"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-72 bg-white shadow-2xl lg:hidden transform transition-transform duration-300 ease-out print:hidden ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-modal="true"
        role="dialog"
        aria-label="منوی ناوبری"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="بستن منو"
          className="absolute top-3 left-3 w-9 h-9 flex items-center justify-center rounded-md text-stone-500 hover:bg-stone-50 z-10"
        >
          <X size={18} strokeWidth={1.5} />
        </button>

        <SidebarContent onNavClick={() => setOpen(false)} />
      </div>
    </>
  );
}
