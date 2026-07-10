import { fmt, toFa } from '@/lib/utils';

/**
 * بخش‌های جداگانه‌ی مبلغ — برای نمایش عدد و واحد با سایزهای متفاوت.
 * `formatMoneyParts(5_400_000_000)` → { main: '۵.۴ میلیارد', unit: 'تومان' }
 * `formatMoneyParts(-6_000_000)`  → { main: '⁦-۶ میلیون⁩', unit: 'تومان' }
 */
export function formatMoneyParts(n: number): { main: string; unit: string } {
  const abs = Math.abs(n);
  let main: string;

  if (abs < 10_000) {
    main = fmt(n); // fmt خودش LTR isolate برای منفی می‌گذارد
  } else if (abs >= 1_000_000_000) {
    const v = (abs / 1_000_000_000).toFixed(1).replace(/\.0$/, '');
    main = n < 0 ? `⁦-${toFa(v)} میلیارد⁩` : `${toFa(v)} میلیارد`;
  } else if (abs >= 1_000_000) {
    const v = (abs / 1_000_000).toFixed(1).replace(/\.0$/, '');
    main = n < 0 ? `⁦-${toFa(v)} میلیون⁩` : `${toFa(v)} میلیون`;
  } else {
    const v = Math.round(abs / 1_000).toString();
    main = n < 0 ? `⁦-${toFa(v)} هزار⁩` : `${toFa(v)} هزار`;
  }

  return { main, unit: 'تومان' };
}

/**
 * توابع فرمت مشترک — تنها مرجع برای نمایش مبلغ و نام شعبه.
 * همه‌ی کامپوننت‌ها از اینجا import کنند، نه مستقیم از utils.
 */

// ─── پول ──────────────────────────────────────────────────────────────

/**
 * مبلغ با جداکننده هزارگان فارسی + «تومان».
 * `formatMoney(1234567)` → '۱,۲۳۴,۵۶۷ تومان'
 * `formatMoney(-5000)` → '⁦-۵,۰۰۰⁩ تومان'
 */
export function formatMoney(n: number): string {
  return `${fmt(n)} تومان`;
}

/**
 * مبالغ بزرگ را خلاصه می‌کند. اعداد منفی با علامت − و در LTR isolate.
 * `formatMoneyShort(5_400_000_000)`  → '۵.۴ میلیارد تومان'
 * `formatMoneyShort(-6_500_000_000)` → '⁦-۶.۵ میلیارد تومان⁩'
 * `formatMoneyShort(4_999)`          → '۴,۹۹۹ تومان'  (زیر ۱۰هزار: فرمت کامل)
 *
 * همه‌ی caller ها باید مقدار اصلی (بدون Math.abs) را پاس کنند —
 * این تابع خودش علامت را مدیریت می‌کند.
 */
export function formatMoneyShort(n: number): string {
  const abs = Math.abs(n);

  if (abs < 10_000) return formatMoney(n);

  let short: string;
  if (abs >= 1_000_000_000) {
    const v = (abs / 1_000_000_000).toFixed(1).replace(/\.0$/, '');
    short = `${toFa(v)} میلیارد تومان`;
  } else if (abs >= 1_000_000) {
    const v = (abs / 1_000_000).toFixed(1).replace(/\.0$/, '');
    short = `${toFa(v)} میلیون تومان`;
  } else {
    const v = Math.round(abs / 1_000).toString();
    short = `${toFa(v)} هزار تومان`;
  }

  // اعداد منفی: علامت را در LTR Isolate می‌پیچیم تا در متن RTL درست رندر شود
  return n < 0 ? `⁦-${short}⁩` : short;
}

// ─── شعبه ─────────────────────────────────────────────────────────────

/**
 * نام نمایشی واحد و ثابت شعبه — تنها نقطه‌ای که می‌توان نگاشت/نرمال‌سازی
 * نام را اضافه کرد بدون اینکه بقیه‌ی کامپوننت‌ها تغییر کنند.
 *
 * رفع S2: در بعضی جاها `branch.name` مستقیم استفاده می‌شد و در بعضی جاها
 * فضای اضافه یا پیشوند «شعبه» داشت. حالا همه از اینجا می‌خوانند.
 */
export function formatBranchName(branch: { name: string }): string {
  return branch.name.trim();
}
