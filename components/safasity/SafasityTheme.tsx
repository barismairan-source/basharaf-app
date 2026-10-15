'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { safasityFontVars } from '@/app/safasity/fonts';
import '@/app/safasity/safasity.css';

/**
 * تم صفاسیتی برای صفحه‌های عمومی لینک‌شده از basharaf.me/safasity.
 * کلاس‌ها (رنگ + متغیر فونت) روی body هم ست می‌شوند تا پاپ‌آپ‌هایی که در body
 * پورتال می‌شوند (تقویم شمسی، مودال‌ها) هم هم‌رنگ باشند؛ موقع خروج برداشته می‌شوند.
 * logo: لوگوی کوچک بالای صفحه که به basharaf.me/safasity برمی‌گردد.
 */
export function SafasityTheme({ children, logo = false }: { children: React.ReactNode; logo?: boolean }) {
  useEffect(() => {
    const classes = ['safasity-root', ...safasityFontVars.split(' ')];
    document.body.classList.add(...classes);
    return () => document.body.classList.remove(...classes);
  }, []);
  return (
    <div className={`safasity-root ${safasityFontVars}`}>
      {logo && <SafasityLogoLink className="mx-auto pt-6" />}
      {children}
    </div>
  );
}

/** لوگوی رسمی صفاسیتی (سرمه‌ای روی کرم، یا کرم روی زمینه‌ی تیره) با لینک به هاب. */
export function SafasityLogoLink({ className = '', width = 120, onDark = false }: { className?: string; width?: number; onDark?: boolean }) {
  return (
    <Link href="/safasity" aria-label="صفاسیتی — بازگشت به صفحه‌ی اصلی" className={`block w-fit ${className}`}>
      <Image
        src={onDark ? '/safasity/wordmark-cream.png' : '/safasity/wordmark.png'}
        alt="صفاسیتی" width={600} height={213} priority
        className="h-auto" style={{ width }}
      />
    </Link>
  );
}
