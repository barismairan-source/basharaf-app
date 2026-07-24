import { getTodayJalali, jalaliToDate, dateToJalali, isValidJalaliString } from '@/lib/jalali';

/**
 * توابع خالص انتخاب بازه‌ی زمانی داشبورد — بدون DB، بدون 'use client'/'use
 * server' اختصاصی، پس هم در API route و هم مستقیم در کامپوننت کلاینت
 * (برای محاسبه‌ی from/to پیش از fetch) قابل import است.
 *
 * چرا فایل جدا از periodReport.ts؟ آن فایل `@/lib/db/client` (اتصال
 * postgres) را import می‌کند؛ اگر یک صفحه‌ی 'use client' چیزی از همان
 * فایل import کند، کل درخت import (شامل postgres، که به ماژول‌های
 * Node-only مثل `perf_hooks` نیاز دارد) وارد باندل مرورگر می‌شود و build
 * می‌شکند. این فایل کاملاً مستقل و بدون هیچ وابستگی به DB است.
 */

export type PeriodKey = 'today' | '7d' | '30d' | 'custom';

export interface ResolvedPeriod {
  period: PeriodKey;
  fromJalali: string;
  toJalali: string;
  /** طول بازه به روز (شامل هر دو سر) — برای محاسبه‌ی بازه‌ی قبلیِ هم‌طول */
  lengthDays: number;
}

/**
 * بازه‌ی درخواستی هدر داشبورد را به یک محدوده‌ی دقیقِ تاریخ شمسی تبدیل می‌کند.
 *
 * `custom` بدون from/to معتبر، یا from بعد از to → null (به‌جای حدس زدن).
 */
export function resolvePeriod(
  period: PeriodKey,
  customFrom?: string | null,
  customTo?: string | null
): ResolvedPeriod | null {
  const today = getTodayJalali();

  if (period === 'today') {
    return { period, fromJalali: today, toJalali: today, lengthDays: 1 };
  }

  if (period === '7d' || period === '30d') {
    const days = period === '7d' ? 7 : 30;
    const todayDate = jalaliToDate(today);
    if (!todayDate) return null;
    const fromDate = new Date(todayDate.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    return { period, fromJalali: dateToJalali(fromDate), toJalali: today, lengthDays: days };
  }

  // custom
  if (!customFrom || !customTo) return null;
  if (!isValidJalaliString(customFrom) || !isValidJalaliString(customTo)) return null;
  const fromDate = jalaliToDate(customFrom);
  const toDate = jalaliToDate(customTo);
  if (!fromDate || !toDate) return null;
  if (fromDate.getTime() > toDate.getTime()) return null;
  const lengthDays = Math.round((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  return { period, fromJalali: customFrom, toJalali: customTo, lengthDays };
}

/** بازه‌ی هم‌طول بلافاصله قبل از بازه‌ی داده‌شده — برای مقایسه‌ی «نسبت به دوره‌ی قبل». */
export function previousPeriod(resolved: ResolvedPeriod): ResolvedPeriod | null {
  const fromDate = jalaliToDate(resolved.fromJalali);
  if (!fromDate) return null;
  const prevToDate = new Date(fromDate.getTime() - 24 * 60 * 60 * 1000);
  const prevFromDate = new Date(prevToDate.getTime() - (resolved.lengthDays - 1) * 24 * 60 * 60 * 1000);
  return {
    period: resolved.period,
    fromJalali: dateToJalali(prevFromDate),
    toJalali: dateToJalali(prevToDate),
    lengthDays: resolved.lengthDays,
  };
}
