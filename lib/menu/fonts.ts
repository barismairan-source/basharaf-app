/**
 * Font registry — the list of Persian fonts the menu can use.
 *
 * `key`     — stored in menu_settings.fa_font and used as the CSS family name
 * `label`   — what the admin sees in the font picker
 * `file`    — the file in /public/fonts
 * `lineHeight` — per-font tweak so heavy faces don't feel cramped
 *
 * To add a new font: drop the .ttf in /public/fonts, add an entry here,
 * and add a matching @font-face + html[data-fa-font=...] rule in globals.css.
 */
export interface FontOption {
  key: string;
  label: string;
  file: string;
  lineHeight: number;
}

export const FA_FONTS: FontOption[] = [
  { key: 'NeveshtFaNum', label: 'نوشت فا',     file: '/fonts/NeveshtFaNum-Black.ttf', lineHeight: 1.6 },
  { key: 'IRANMarker',   label: 'ایران مارکر', file: '/fonts/IRANMarker.ttf',          lineHeight: 1.7 },
  { key: 'HastiHeavy',   label: 'هستی هِوی',   file: '/fonts/Hasti-HeavyR.ttf',        lineHeight: 1.7 },
  { key: 'BlockFD',      label: 'بلاک',        file: '/fonts/BlockFD-VF.ttf',          lineHeight: 1.8 },
];

export const DEFAULT_FA_FONT = 'IRANMarker';

/** Look up a font by key, falling back to the default. */
export function getFont(key: string | null | undefined): FontOption {
  return FA_FONTS.find((f) => f.key === key) ?? FA_FONTS[0]!;
}

/**
 * فونت‌های انگلیسی — همان الگوی FA_FONTS.
 * هر دو فونت فعلی دست‌خطی‌اند و x-height کوچکی دارند، یعنی در همان اندازه‌ی
 * پیکسلِ فونت فارسی، ریزتر به‌نظر می‌رسند — به همین دلیل کامپوننت‌های منو
 * (MenuItem/MenuSection) برای language === 'en' یک پله بزرگ‌تر رندر می‌کنند.
 */
export const EN_FONTS: FontOption[] = [
  { key: 'GochiHand',     label: 'Gochi Hand',      file: '/fonts/GochiHand-Regular.ttf',      lineHeight: 1.6 },
  { key: 'PatrickHandSC', label: 'Patrick Hand SC', file: '/fonts/PatrickHandSC-Regular.woff2', lineHeight: 1.6 },
];

export const DEFAULT_EN_FONT = 'GochiHand';

export function getEnFont(key: string | null | undefined): FontOption {
  return EN_FONTS.find((f) => f.key === key) ?? EN_FONTS[0]!;
}
