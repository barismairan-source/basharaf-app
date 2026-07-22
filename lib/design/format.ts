import { toFa } from '@/lib/utils';

/**
 * علامت منفی استاندارد یونیکد (U+2212) — نه هایفن معمولی (U+002D).
 * در بافت مالی/RTL درست‌تر رندر می‌شود و با فونت اعداد هم‌ارتفاع است.
 */
const MINUS = '−';
/** ایزوله‌ی چپ‌به‌راست (LRI/PDI) — مانع جابه‌جایی علامت/عدد/واحد در RTL می‌شود. */
const LRI = '⁦';
const PDI = '⁩';

/** مقدار مطلق را به فرمت کوتاه (میلیارد/میلیون/هزار) یا کامل، بدون علامت و بدون واحد برمی‌گرداند. */
function shortMagnitude(abs: number): string {
  if (abs < 10_000) return toFa(Math.round(abs).toLocaleString('en-US'));
  if (abs >= 1_000_000_000) {
    const v = (abs / 1_000_000_000).toFixed(1).replace(/\.0$/, '');
    return `${toFa(v)} میلیارد`;
  }
  if (abs >= 1_000_000) {
    const v = (abs / 1_000_000).toFixed(1).replace(/\.0$/, '');
    return `${toFa(v)} میلیون`;
  }
  const v = Math.round(abs / 1_000).toString();
  return `${toFa(v)} هزار`;
}

/**
 * بخش‌های جداگانه‌ی مبلغ — برای نمایش عدد و واحد با سایزهای متفاوت.
 * `formatMoneyParts(5_400_000_000)` → { main: '۵.۴ میلیارد', unit: 'تومان' }
 * `formatMoneyParts(-6_000_000)`  → { main: '−۶ میلیون', unit: 'تومان' }
 */
export function formatMoneyParts(n: number): { main: string; unit: string } {
  const sign = n < 0 ? MINUS : '';
  return { main: `${sign}${shortMagnitude(Math.abs(n))}`, unit: 'تومان' };
}

/**
 * Helper مرکزی برای مبلغ علامت‌دار — تنها منبع درست برای +/− در متن RTL.
 * - علامت منفی همیشه U+2212 است، هرگز هایفن معمولی.
 * - `showPlus`: مبالغ مثبت هم با + نمایش داده شوند (برای ردیف‌های تراکنش که
 *   جهت پول را نشان می‌دهند — نه برای دیتای صرفاً می‌تواند منفی مثل مانده).
 * - `short`: فرمت کوتاه (میلیون/میلیارد) به‌جای عدد کامل.
 * - کل نتیجه (علامت+عدد+واحد) داخل یک LTR isolate واحد قرار می‌گیرد تا در
 *   بافت RTL جابه‌جا/بازچینی نشود.
 */
export function formatSignedMoney(n: number, opts?: { showPlus?: boolean; short?: boolean }): string {
  const sign = n < 0 ? MINUS : opts?.showPlus && n > 0 ? '+' : '';
  const abs = Math.abs(n);
  const body = opts?.short ? `${shortMagnitude(abs)} تومان` : `${toFa(Math.round(abs).toLocaleString('en-US'))} تومان`;
  return `${LRI}${sign}${body}${PDI}`;
}

// ─── پول ──────────────────────────────────────────────────────────────

/**
 * مبلغ با جداکننده هزارگان فارسی + «تومان».
 * `formatMoney(1234567)` → '۱,۲۳۴,۵۶۷ تومان'
 * `formatMoney(-5000)` → '⁦−۵,۰۰۰ تومان⁩'
 */
export function formatMoney(n: number): string {
  return formatSignedMoney(n);
}

/**
 * مبالغ بزرگ را خلاصه می‌کند. اعداد منفی با علامت − و در LTR isolate.
 * `formatMoneyShort(5_400_000_000)`  → '۵.۴ میلیارد تومان'
 * `formatMoneyShort(-6_500_000_000)` → '⁦−۶.۵ میلیارد تومان⁩'
 * `formatMoneyShort(4_999)`          → '۴,۹۹۹ تومان'  (زیر ۱۰هزار: فرمت کامل)
 *
 * همه‌ی caller ها باید مقدار اصلی (بدون Math.abs) را پاس کنند —
 * این تابع خودش علامت را مدیریت می‌کند.
 */
export function formatMoneyShort(n: number): string {
  return formatSignedMoney(n, { short: true });
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
