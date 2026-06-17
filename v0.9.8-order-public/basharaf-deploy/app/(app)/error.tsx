'use client';

import { useEffect } from 'react';
import { AlertOctagon, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui';

/**
 * Error boundary برای routeهای داخل (app) — خطاهای client-side در صفحات
 * dashboard/transactions/settings را می‌گیرد بدون اینکه global-error.tsx
 * (که full-page replacement است) فعال شود.
 *
 * این یعنی header و sidebar باقی می‌مانند و کاربر می‌تواند به route دیگری
 * navigate کند.
 */
export default function AppRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.error('App route error:', error);
    }
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto text-rose-600">
          <AlertOctagon size={20} strokeWidth={1.5} aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-[16px] text-stone-900 font-medium tracking-tight">
          خطا در این صفحه
        </h2>
        <p className="mt-2 text-[12.5px] text-stone-500 leading-7">
          این صفحه با مشکلی روبرو شد. می‌توانید آن را دوباره بارگذاری کنید.
        </p>

        {process.env.NODE_ENV !== 'production' && error.message && (
          <pre className="mt-4 p-3 bg-stone-100 border border-stone-200 rounded-md text-[10.5px] text-stone-600 text-start overflow-x-auto whitespace-pre-wrap">
            {error.message}
          </pre>
        )}

        <div className="mt-5">
          <Button variant="primary" icon={RotateCw} onClick={reset}>
            تلاش مجدد
          </Button>
        </div>
      </div>
    </div>
  );
}
