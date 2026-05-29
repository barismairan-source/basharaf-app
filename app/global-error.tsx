'use client';

import { useEffect } from 'react';
import { AlertOctagon, RotateCw, Home } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui';

/**
 * Error boundary صفحه — Next.js این فایل را وقتی React error در رندر
 * یکی از routeهای زیرین مشاهده می‌کند، خودکار نمایش می‌دهد.
 *
 * `app/error.tsx` در root → روی همه‌ی app اعمال می‌شود.
 * می‌توان `app/(app)/error.tsx` هم اضافه کرد برای fallback اختصاصی.
 *
 * نکته: این فقط برای client errors است. server errors به‌صورت 500 page
 * نمایش داده می‌شوند (که Next خودش دارد).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // log error in development; در production می‌توان به Sentry فرستاد
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Page error:', error);
    }
  }, [error]);

  return (
    <html lang="fa" dir="rtl">
      <body className="font-sans antialiased bg-stone-50 min-h-screen">
        <div className="min-h-screen flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto text-rose-600">
              <AlertOctagon size={22} strokeWidth={1.5} aria-hidden="true" />
            </div>
            <h1 className="mt-5 text-[20px] text-stone-900 font-medium tracking-tight">
              مشکلی پیش آمد
            </h1>
            <p className="mt-2 text-[12.5px] text-stone-500 leading-7">
              متاسفانه خطایی رخ داده است. می‌توانید تلاش کنید صفحه را دوباره
              بارگذاری کنید، یا به داشبورد بازگردید.
            </p>

            {process.env.NODE_ENV !== 'production' && error.message && (
              <pre className="mt-4 p-3 bg-stone-100 border border-stone-200 rounded-md text-[10.5px] text-stone-600 text-start overflow-x-auto whitespace-pre-wrap">
                {error.message}
              </pre>
            )}

            <div className="mt-6 flex items-center justify-center gap-2">
              <Button variant="primary" icon={RotateCw} onClick={reset}>
                تلاش مجدد
              </Button>
              <Link href="/dashboard">
                <Button variant="default" icon={Home}>
                  بازگشت به داشبورد
                </Button>
              </Link>
            </div>

            {error.digest && (
              <div className="mt-6 text-[10.5px] text-stone-400" dir="ltr">
                Error ID: {error.digest}
              </div>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
