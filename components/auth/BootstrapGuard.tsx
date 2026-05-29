'use client';

import { useAppStore } from '@/store';

/**
 * BootstrapGuard — نمایش skeleton تا زمانی که داده‌ها از API لود شوند.
 *
 * مشکل: صفحه render می‌شود قبل از اینکه bootstrap() کامل شود
 * → کاربر صفحه خالی می‌بیند و باید reload کند.
 *
 * راه‌حل: تا bootstrapped=true نشود، یک loading overlay نمایش می‌دهیم.
 * این یعنی هیچ‌وقت نیاز به reload نیست.
 */
export function BootstrapGuard({ children }: { children: React.ReactNode }) {
  const bootstrapped = useAppStore(s => s.bootstrapped);
  const user = useAppStore(s => s.user);

  // اگر bootstrap در حال اجرا است
  if (!bootstrapped) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin" />
          <div className="text-[12px] text-stone-400">در حال بارگذاری...</div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
