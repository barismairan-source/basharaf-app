import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind-aware className merger.
 * Use everywhere components conditionally apply classes.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ─────────────────────────────────────────────────────────────────
// Persian number helpers — mirrored from the prototype's `toFa`/`fmt`
// ─────────────────────────────────────────────────────────────────

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const;

/**
 * تبدیل ارقام لاتین به ارقام فارسی.
 * `toFa(2025)` → '۲۰۲۵'
 * `toFa('1,234')` → '۱,۲۳۴'
 */
export function toFa(value: number | string): string {
  return String(value).replace(/[0-9]/g, (digit) => PERSIAN_DIGITS[Number(digit)]!);
}

/**
 * فرمت کردن یک عدد به‌صورت فارسی با جداکننده هزارگان.
 * `fmt(1234567)` → '۱,۲۳۴,۵۶۷'
 *
 * این تابع از locale 'en-US' برای جداکننده استفاده می‌کند (کاما)
 * چون پروتوتایپ همین رفتار را داشت. اگر بعداً جداکننده فارسی
 * (٬) خواستید، اینجا تعویض می‌شود.
 */
export function fmt(value: number): string {
  return toFa(value.toLocaleString('en-US'));
}

/**
 * عکس فرمت — رشته‌ای با ارقام فارسی/لاتین و جداکننده‌ها را به عدد خالص برمی‌گرداند.
 * برای پارس کردن مقدار ورودی فرم استفاده می‌شود.
 *
 * `parseAmount('۱,۲۳۴,۵۶۷')` → 1234567
 * `parseAmount('1,234')` → 1234
 * `parseAmount('')` → 0
 */
export function parseAmount(input: string): number {
  if (!input) return 0;
  const normalized = input
    .replace(/[^\d۰-۹]/g, '') // حذف هر چیز غیر از رقم
    .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit as (typeof PERSIAN_DIGITS)[number])));
  return Number(normalized) || 0;
}

/**
 * فرمت کردن ورودی فرم در حین تایپ — رقم فارسی، با جداکننده، بدون فاصله.
 * استفاده در onChange یک input مبلغ.
 *
 * `formatAmountInput('1234')` → '۱,۲۳۴'
 * `formatAmountInput('abc')` → ''
 */
export function formatAmountInput(input: string): string {
  const num = parseAmount(input);
  if (!num) return '';
  return fmt(num);
}
