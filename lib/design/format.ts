import { fmt, toFa } from '@/lib/utils';

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
 * مبالغ بزرگ را خلاصه می‌کند.
 * `formatMoneyShort(5_400_000_000)` → '۵.۴ میلیارد تومان'
 * `formatMoneyShort(54_000_000)`    → '۵۴ میلیون تومان'
 * `formatMoneyShort(540_000)`       → '۵۴۰ هزار تومان'
 * `formatMoneyShort(4_999)`         → '۴,۹۹۹ تومان'  (زیر ۱۰هزار: فرمت کامل)
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
