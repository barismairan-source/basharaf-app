import type { OrderStatus } from '@/types';

/**
 * ─────────────────────────────────────────────────────────────────
 * State machine سفارش بیرون‌بر — منبع واحد حقیقت برای:
 * - app/api/orders/[id]/status (اعتبارسنجی انتقال، 422 اگر نامعتبر)
 * - app/(app)/orders (دکمه‌های انتقال + ستون‌بندی Kanban)
 * - app/order/track/[token] (برچسب وضعیت برای مشتری)
 *
 * مسیر: received → confirmed → preparing → ready
 *   → (delivery) out_for_delivery → delivered
 *   → (pickup)   completed
 * هر مرحله‌ی غیرنهایی می‌تواند به cancelled برود؛ فقط received می‌تواند rejected شود.
 * ───────────────────────────────────────────────────────────────── */

export const ORDER_STATUSES: ReadonlyArray<OrderStatus> = [
  'received', 'confirmed', 'preparing', 'ready',
  'out_for_delivery', 'delivered', 'completed', 'cancelled', 'rejected',
];

/** برچسب فارسی هر وضعیت — برای کارت سفارش، ستون Kanban، و رهگیری مشتری. */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  received: 'ثبت‌شده',
  confirmed: 'تأییدشده',
  preparing: 'در حال آماده‌سازی',
  ready: 'آماده',
  out_for_delivery: 'در حال ارسال',
  delivered: 'تحویل شد',
  completed: 'تکمیل شد',
  cancelled: 'لغو شد',
  rejected: 'رد شد',
};

/** رنگ Chip هر وضعیت — برای کارت سفارش و رهگیری مشتری. */
export const ORDER_STATUS_TONES: Record<OrderStatus, 'neutral' | 'green' | 'red' | 'amber'> = {
  received: 'amber',
  confirmed: 'amber',
  preparing: 'amber',
  ready: 'green',
  out_for_delivery: 'green',
  delivered: 'green',
  completed: 'green',
  cancelled: 'red',
  rejected: 'red',
};

/** برچسب دکمه‌ی انتقال به این وضعیت (روی کارت سفارش). */
export const ORDER_TRANSITION_LABELS: Partial<Record<OrderStatus, string>> = {
  confirmed: 'تأیید سفارش',
  preparing: 'شروع آماده‌سازی',
  ready: 'آماده شد',
  out_for_delivery: 'خروج برای ارسال',
  delivered: 'تحویل داده شد',
  completed: 'تکمیل سفارش',
  cancelled: 'لغو سفارش',
  rejected: 'رد سفارش',
};

/** وضعیت‌های پایانی — هیچ انتقالی از این‌ها مجاز نیست. */
export const TERMINAL_STATUSES: ReadonlyArray<OrderStatus> = ['delivered', 'completed', 'cancelled', 'rejected'];

export function isTerminalStatus(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/**
 * فهرست انتقال‌های مجاز از یک وضعیت — بسته به نوع سرویس
 * (ready → out_for_delivery فقط برای ارسال؛ ready → completed فقط برای دریافت حضوری).
 */
export function getValidTransitions(status: OrderStatus, serviceType: 'delivery' | 'pickup'): OrderStatus[] {
  switch (status) {
    case 'received': return ['confirmed', 'rejected'];
    case 'confirmed': return ['preparing', 'cancelled'];
    case 'preparing': return ['ready', 'cancelled'];
    case 'ready':
      return serviceType === 'delivery' ? ['out_for_delivery', 'cancelled'] : ['completed', 'cancelled'];
    case 'out_for_delivery': return ['delivered', 'cancelled'];
    case 'delivered':
    case 'completed':
    case 'cancelled':
    case 'rejected':
      return [];
  }
}

export function canTransition(from: OrderStatus, to: OrderStatus, serviceType: 'delivery' | 'pickup'): boolean {
  return getValidTransitions(from, serviceType).includes(to);
}

/** ستون‌های تخته‌ی Kanban — ترتیب نمایش از سمت راست به چپ (RTL). */
export const BOARD_COLUMNS: ReadonlyArray<{ key: string; label: string; statuses: OrderStatus[] }> = [
  { key: 'received', label: ORDER_STATUS_LABELS.received, statuses: ['received'] },
  { key: 'confirmed', label: ORDER_STATUS_LABELS.confirmed, statuses: ['confirmed'] },
  { key: 'preparing', label: ORDER_STATUS_LABELS.preparing, statuses: ['preparing'] },
  { key: 'ready', label: ORDER_STATUS_LABELS.ready, statuses: ['ready'] },
  { key: 'out_for_delivery', label: ORDER_STATUS_LABELS.out_for_delivery, statuses: ['out_for_delivery'] },
  { key: 'done', label: 'تکمیل‌شده', statuses: ['delivered', 'completed'] },
  { key: 'closed', label: 'لغو/رد شده', statuses: ['cancelled', 'rejected'] },
];
