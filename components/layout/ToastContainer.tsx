'use client';

import { useAppStore } from '@/store';
import { Toast } from '@/components/ui';

/**
 * ToastContainer — جایگاه ثابت برای toasts.
 *
 * - moisture moves to `bottom-6 left-6` در LTR / `bottom-6 right-6` در RTL... ولی
 *   پروتوتایپ سمت چپ بود حتی در RTL. به نظر می‌رسد سمت چپ در RTL برای
 *   toastها طبیعی است (مثل notification‌های سیستم).
 * - z-50 برای روی همه چیز.
 * - pointer-events-none روی container تا از کلیک‌های زیرین جلوگیری نکند.
 *   toasts خودشان pointer-events-auto دارند (در Toast کامپوننت).
 *
 * در root layout قرار می‌گیرد.
 */
export function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div
      // در RTL، `left-6` همان «سمت چپ فیزیکی» است. این عمدی است.
      className="fixed bottom-6 left-6 z-[100] flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <Toast data={t} />
        </div>
      ))}
    </div>
  );
}
