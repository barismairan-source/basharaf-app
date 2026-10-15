import localFont from 'next/font/local';

/**
 * فونت‌های برند صفاسیتی — با next/font: خودمیزبان، preload خودکار در همان
 * صفحه‌ها (بدون پرش فونت)، و فقط روی صفحه‌هایی که این ماژول را import می‌کنند.
 * فقط وزن Bold — همه‌ی متن‌های فونت برند (تیتر، دکمه‌ی اصلی، برچسب) بولد هستند.
 * size-adjust: بدنه‌ی حروف Haiku ~۳۲٪ کوچک‌تر از Vazirmatn است؛ هم‌اندازه‌شان می‌کند.
 */
export const haiku = localFont({
  src: [
    { path: './font-files/Haiku-RavanBold.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-haiku',
  display: 'swap',
  preload: true,
  adjustFontFallback: false,
  declarations: [{ prop: 'size-adjust', value: '135%' }],
});

export const stiffBallpoint = localFont({
  src: [{ path: './font-files/StiffBallpoint-Regular.woff2', weight: '400', style: 'normal' }],
  variable: '--font-stiff',
  display: 'swap',
  preload: true,
  adjustFontFallback: false,
  declarations: [
    { prop: 'size-adjust', value: '112%' },
    { prop: 'unicode-range', value: 'U+0020-007E, U+00A0-00FF, U+2010-203A' },
  ],
});

export const safasityFontVars = `${haiku.variable} ${stiffBallpoint.variable}`;
