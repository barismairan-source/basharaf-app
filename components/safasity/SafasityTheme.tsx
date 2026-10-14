'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import '@/app/safasity/safasity.css';

/**
 * تم صفاسیتی برای صفحه‌های عمومی لینک‌شده از basharaf.me/safasity.
 * کلاس روی body هم ست می‌شود تا پاپ‌آپ‌هایی که در body پورتال می‌شوند
 * (تقویم شمسی، مودال‌ها) هم هم‌رنگ باشند؛ موقع خروج از صفحه برداشته می‌شود.
 * logo: لوگوی کوچک بالای صفحه که به basharaf.me/safasity برمی‌گردد.
 */
export function SafasityTheme({ children, logo = false }: { children: React.ReactNode; logo?: boolean }) {
  useEffect(() => {
    document.body.classList.add('safasity-root');
    return () => document.body.classList.remove('safasity-root');
  }, []);
  return (
    <div className="safasity-root">
      {logo && (
        <Link href="/safasity" aria-label="صفاسیتی — بازگشت" className="mx-auto block w-fit pt-6">
          <Image src="/safasity/wordmark.png" alt="صفاسیتی" width={600} height={213} priority className="h-auto w-[120px]" />
        </Link>
      )}
      {children}
    </div>
  );
}
