import type { StateCreator } from 'zustand';
import type { ToastData, ToastTone } from '@/components/ui';


/**
 * UISlice — حالت UI اپ (نه دیتا).
 *
 * شامل:
 * - toasts: لیست toastهای فعال
 * - openTxId: شناسه تراکنشی که detail panel‌اش باز است
 * - branchFilter: branch.id فعلی در داشبورد (یا null برای «همه»)
 *
 * هیچ‌کدام از این‌ها persist نمی‌شوند چون فقط transient هستند.
 */
export interface UiSlice {
  toasts: ToastData[];
  openTxId: string | null;
  branchFilter: string | null;

  /** نمایش یک toast. به‌صورت خودکار بعد از ۳ ثانیه حذف می‌شود. */
  showToast: (text: string, tone?: ToastTone, sub?: string) => void;

  /** حذف یک toast — معمولاً auto، گاهی manual */
  dismissToast: (id: string) => void;

  /** باز/بسته کردن detail panel تراکنش */
  openTx: (id: string | null) => void;

  /** تعویض branch filter (null = همه شعب — فقط برای SuperAdmin) */
  setBranchFilter: (branchId: string | null) => void;
}

export const createUiSlice: StateCreator<UiSlice> = (set, get) => ({
  toasts: [],
  openTxId: null,
  branchFilter: null,

  showToast(text, tone = 'success', sub) {
    const id = crypto.randomUUID();
    const toast: ToastData = sub
      ? { id, tone, text, sub }
      : { id, tone, text };

    set((state) => ({ toasts: [...state.toasts, toast] }));

    // حذف خودکار بعد از ۳ ثانیه. در محیط server (SSR) setTimeout موجود است
    // ولی در آن مسیر اصلاً این تابع فراخوانی نمی‌شود.
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 3000);
  },

  dismissToast(id) {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  openTx(id) {
    set({ openTxId: id });
  },

  setBranchFilter(branchId) {
    set({ branchFilter: branchId });
  },
});
