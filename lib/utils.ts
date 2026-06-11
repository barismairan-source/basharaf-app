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
 *
 * برای اعداد منفی: ارقام فارسی از نوع bidi «AN» هستند و علامت منفی با
 * آن‌ها ترکیب نمی‌شود؛ در متن RTL این باعث می‌شود علامت منفی سمت چپ
 * بیفتد (مثلاً «۱۰۰-» به‌جای «-۱۰۰»). با محصور کردن «−عدد» بین
 * Left-to-Right Isolate (U+2066) و Pop Directional Isolate (U+2069)،
 * کل بلوک به‌عنوان یک واحد LTR مستقل از جهت متن اطراف رندر می‌شود.
 */
export function fmt(value: number): string {
  if (value < 0) {
    return `⁦-${toFa(Math.abs(value).toLocaleString('en-US'))}⁩`;
  }
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

/**
 * onChange هندلر برای input عددیِ لاتین با جداکننده هزارگان (toLocaleString('en-US')).
 *
 * مشکل بدون این تابع: با هر کلیدی که زده می‌شود، رشته از نو فرمت می‌شود
 * و چون طول رشته با اضافه/حذف‌شدن کاما عوض می‌شود، مرورگر موقعیت cursor
 * را بر اساس «اندیس کاراکتر» نگه می‌دارد نه «چندمین رقم» — در نتیجه حین
 * تایپ، cursor به وسط عدد می‌پرد و ارقام بعدی جای اشتباه می‌نشینند.
 *
 * این تابع موقعیت cursor را بر اساس تعداد رقم‌های قبل از آن حفظ می‌کند.
 */
export function formatNumericInputValue(input: HTMLInputElement): string {
  const raw = input.value;
  const cursorPos = input.selectionStart ?? raw.length;
  const digitsBeforeCursor = raw.slice(0, cursorPos).replace(/\D/g, '').length;

  const n = parseInt(raw.replace(/\D/g, ''), 10) || 0;
  const formatted = n ? n.toLocaleString('en-US') : '';

  let newPos = digitsBeforeCursor === 0 ? 0 : formatted.length;
  let digitCount = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (formatted[i]! >= '0' && formatted[i]! <= '9') {
      digitCount++;
      if (digitCount === digitsBeforeCursor) {
        newPos = i + 1;
        break;
      }
    }
  }

  requestAnimationFrame(() => {
    if (document.activeElement === input) input.setSelectionRange(newPos, newPos);
  });

  return formatted;
}
