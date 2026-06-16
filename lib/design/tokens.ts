/**
 * Single source of truth for design values.
 *
 * این فایل تنها مرجع رنگ، شعاع، فاصله و اندازه‌ی فونت است.
 * tailwind.config.ts از `colors` و `fontSize` اینجا import می‌کند.
 * هیچ hard-code رنگی در کامپوننت‌ها مجاز نیست — از کلاس‌های Tailwind استفاده کنید.
 *
 * نگاشت رنگ‌ها به کلاس Tailwind:
 *   bg-bg         bg-surface      text-text       text-muted
 *   bg-accent     text-accent     bg-accent-subtle
 *   text-ok       bg-ok-subtle
 *   text-warn     bg-warn-subtle
 *   text-danger   bg-danger-subtle   (danger CSS-var هم همچنان موجود است)
 *   bg-border     border-border
 */

// ─── رنگ‌ها ──────────────────────────────────────────────────────────
// مقادیر hex برای light mode (تنها mode فعال فعلاً).
// رنگ‌های CSS-var-backed (border, muted, danger, success, warning) در globals.css
// نیز تعریف شده‌اند — این فایل مرجع اعلامی آن‌هاست.

export const colors = {
  // پس‌زمینه‌ها
  bg:             '#fafaf9',   // stone-50  — صفحه/پس‌زمینه‌ی کلی
  surface:        '#ffffff',   // white     — کارت / پنل / modal

  // مرزها
  border:         '#e7e5e4',   // stone-200 — خطوط جداکننده و دور ورودی‌ها

  // متن
  text:           '#1c1917',   // stone-900 — متن اصلی
  muted:          '#78716c',   // stone-500 — متن ثانوی / placeholder

  // accent — آبی برای تعامل‌پذیری، لینک، state فعال
  accent:         '#2563eb',   // blue-600
  'accent-subtle':'#eff6ff',   // blue-50

  // ok — عملکرد موفق
  ok:             '#15803d',   // emerald-700
  'ok-subtle':    '#f0fdf4',   // emerald-50

  // warn — هشدار
  warn:           '#d97706',   // amber-600
  'warn-subtle':  '#fffbeb',   // amber-50

  // danger — خطا / مخرب
  danger:         '#be123c',   // rose-700
  'danger-subtle':'#fff1f2',   // rose-50
} as const;

export type ColorToken = keyof typeof colors;

// ─── شعاع گوشه ────────────────────────────────────────────────────────
// در tailwind.config.ts از `--radius` CSS var استفاده می‌شود (= lg = 0.5rem).
// این مقادیر برای استفاده‌ی مستقیم در JS/inline-style هستند.

export const radius = {
  sm:   '0.25rem',   // 4px
  md:   '0.375rem',  // 6px
  lg:   '0.5rem',    // 8px  ← پیش‌فرض --radius
  xl:   '0.75rem',   // 12px
  full: '9999px',
} as const;

// ─── فاصله ────────────────────────────────────────────────────────────
// مقیاس استاندارد Tailwind (1=4px) هم‌راستا است.
// این export برای استفاده‌ی مستقیم در JS است.

export const spacing = {
  0.5: '0.125rem',   // 2px
  1:   '0.25rem',    // 4px
  2:   '0.5rem',     // 8px
  3:   '0.75rem',    // 12px
  4:   '1rem',       // 16px
  6:   '1.5rem',     // 24px
  8:   '2rem',       // 32px
  12:  '3rem',       // 48px
  16:  '4rem',       // 64px
} as const;

// ─── اندازه‌ی فونت ──────────────────────────────────────────────────────
// گام‌هایی که در Tailwind پیش‌فرض وجود ندارند (2xs=10px, md=13px) به
// tailwind.config.ts اضافه می‌شوند و کلاس text-2xs / text-md می‌سازند.
// بقیه فقط مرجع هستند (با text-xs/sm/base/lg/xl/2xl Tailwind همپوشانی دارند).

export const fontSize = {
  '2xs': '0.625rem',    // 10px — کوچک‌ترین برچسب / badge
  xs:    '0.6875rem',   // 11px  → text-xs Tailwind (≈ 12px)
  sm:    '0.75rem',     // 12px
  md:    '0.8125rem',   // 13px — بین xs و sm Tailwind، کاربرد زیاد در UI
  base:  '0.875rem',    // 14px  → text-sm Tailwind
  lg:    '1rem',        // 16px  → text-base Tailwind
  xl:    '1.125rem',    // 18px  → text-lg Tailwind
  '2xl': '1.25rem',     // 20px  → text-xl Tailwind
} as const;
