/**
 * یکسان‌سازی متن جستجوی داوطلبان — هم سمت سرور (SQL) و هم سمت کلاینت.
 * ارقام فارسی/عربی → انگلیسی، «ي/ك» عربی → «ی/ک» فارسی، نیم‌فاصله → فاصله.
 * SEARCH_TRANSLATE_FROM/TO عیناً در translate() پستگرس استفاده می‌شوند تا
 * ستون‌های دیتابیس هم با همین قاعده یکسان شوند (طول دو رشته باید برابر بماند).
 */
export const SEARCH_TRANSLATE_FROM = '۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩يكى‌';
export const SEARCH_TRANSLATE_TO   = '01234567890123456789یکی ';

const MAP = new Map<string, string>(
  Array.from(SEARCH_TRANSLATE_FROM).map((ch, i) => [ch, Array.from(SEARCH_TRANSLATE_TO)[i]!])
);

export function normalizeSearchText(input: string): string {
  let out = '';
  for (const ch of input) out += MAP.get(ch) ?? ch;
  return out.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** کلمه‌های جستجو (همه باید پیدا شوند — «علی رضایی» هر دو کلمه را لازم دارد). */
export function searchTokens(input: string): string[] {
  return normalizeSearchText(input).split(' ').filter(Boolean);
}

/**
 * اگر جستجو شبیه شماره موبایل باشد (فقط رقم/فاصله/خط تیره/+)، هسته‌ی رقمی
 * آن را برمی‌گرداند: «۰۹۱۲ ۳۴۵»، «+98912345» و «912345» همه → «912345».
 * پیشوند ۰۰۹۸/۹۸/۰ حذف می‌شود تا با هر شکل ذخیره‌ی شماره جور شود.
 */
export function phoneDigitsQuery(input: string): string | null {
  const n = normalizeSearchText(input);
  if (!/^[\d\s+\-()]+$/.test(n)) return null;
  let digits = n.replace(/\D/g, '');
  if (digits.length < 3) return null;
  if (digits.startsWith('0098')) digits = digits.slice(4);
  else if (digits.startsWith('98') && digits.length > 4) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = digits.slice(1);
  return digits || null;
}
