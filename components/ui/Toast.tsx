'use client';

import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Toast — اعلان شناور پس از اقدامات CRUD.
 *
 * این فاز فقط جنبه visual است. در فاز ۳ یک slice در Zustand و یک
 * `<ToastContainer />` در root layout اضافه می‌شود که این کامپوننت را
 * با state سراسری رندر می‌کند، و یک hook `useToast()` برای فراخوانی.
 *
 * موقعیت: fixed bottom-6 inset-inline-start-6 (در RTL: پایین-راست،
 * در LTR: پایین-چپ). در پروتوتایپ ثابت پایین-چپ بود.
 *
 * انواع:
 * - success: نقطه emerald (تایید موفق، ذخیره موفق)
 * - danger: نقطه rose (رد تراکنش، حذف)
 */
export type ToastTone = 'success' | 'danger';

export interface ToastData {
  id: string;
  tone: ToastTone;
  text: string;
  /** خط دوم اختیاری برای context بیشتر */
  sub?: string;
}

export interface ToastProps {
  data: ToastData;
}

export function Toast({ data }: ToastProps) {
  const isDanger = data.tone === 'danger';
  return (
    <div
      role={isDanger ? 'alert' : 'status'}
      aria-live={isDanger ? 'assertive' : 'polite'}
      className="w-full sm:w-auto bg-stone-900 text-white rounded-md px-4 py-3 flex items-center gap-3 shadow-toast sm:min-w-[280px] max-w-md animate-slide-up"
    >
      <div
        className={cn(
          'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
          isDanger
            ? 'bg-rose-500/20 text-rose-400'
            : 'bg-emerald-500/20 text-emerald-400'
        )}
        aria-hidden="true"
      >
        {isDanger ? (
          <X size={12} strokeWidth={2} />
        ) : (
          <Check size={12} strokeWidth={2} />
        )}
      </div>
      <div className="min-w-0">
        <div className="text-[12.5px] text-white truncate">{data.text}</div>
        {data.sub && (
          <div className="text-[11px] text-stone-400 mt-0.5 truncate">
            {data.sub}
          </div>
        )}
      </div>
    </div>
  );
}
