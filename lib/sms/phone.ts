const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const IRAN_MOBILE_RE = /^09\d{9}$/;

function toAsciiDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)));
}

/**
 * شماره‌ی موبایل ایران را به قالب یکدست 09xxxxxxxxx نرمال می‌کند.
 * فرمت‌های پذیرفته‌شده: 09121234567، 9121234567، +989121234567،
 * 00989121234567، 989121234567 (با/بدون فاصله یا خط تیره، ارقام فارسی/عربی).
 * خروجی نامعتبر → null (fail-closed، نه throw).
 */
export function normalizeIranPhone(raw: string): string | null {
  if (!raw) return null;

  let s = toAsciiDigits(raw.trim()).replace(/[\s\-()]/g, '');

  if (s.startsWith('+98')) s = '0' + s.slice(3);
  else if (s.startsWith('0098')) s = '0' + s.slice(4);
  else if (s.startsWith('98') && s.length === 12) s = '0' + s.slice(2);
  else if (s.startsWith('9') && s.length === 10) s = '0' + s;

  return IRAN_MOBILE_RE.test(s) ? s : null;
}
