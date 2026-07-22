'use client';

import { useAppStore } from '@/store';
import { Toast } from '@/components/ui';

/**
 * ToastContainer — جایگاه ثابت برای toasts.
 *
 * - moisture moves to `bottom-6 left-6` در LTR / `bottom-6 right-6` در RTL... ولی
 *   پروتوتایپ سمت چپ بود حتی در RTL. به نظر می‌رسد سمت چپ در RTL برای
 *   toastها طبیعی است (مثل notification‌های سیستم).
 * - موبایل (زیر md، همون breakpoint که BottomTabBar نمایش داده می‌شه):
 *   باید بالاتر از BottomTabBar (h-16 = 4rem) + safe-area بشینه، وگرنه
 *   toast پشت نوار پایین موبایل پنهان می‌شه. عرضش هم به‌جای موقعیت ثابت
 *   left-6، با inset-x-4 نسبت به کل صفحه تنظیم می‌شه.
 * - دسکتاپ (md به بالا، جایی که BottomTabBar نیست): موقعیت قبلی بدون تغییر.
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
      // موبایل: بالاتر از BottomTabBar+safe-area، inset-x-4. دسکتاپ (md+): بدون تغییر (bottom-6 left-6).
      className="fixed z-[100] flex flex-col gap-2 pointer-events-none bottom-[calc(4rem+env(safe-area-inset-bottom)+0.75rem)] inset-x-4 md:inset-x-auto md:bottom-6 md:left-6"
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
