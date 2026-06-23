/**
 * تنظیمات کاربر — قابل ویرایش از Settings > تنظیمات سامانه
 */
export type AccentColor = 'blue' | 'violet' | 'emerald' | 'orange' | 'pink' | 'teal';

export interface Preferences {
  darkMode: boolean;
  compact: boolean;
  language: 'fa' | 'en';
  currency: 'toman' | 'rial';
  calendar: 'jalali' | 'gregorian';
  notifyPending: boolean;
  weeklyEmail: boolean;
  sidebarCollapsed: boolean;
  accentColor: AccentColor;
}

export const DEFAULT_PREFERENCES: Preferences = {
  darkMode: false,
  compact: false,
  language: 'fa',
  currency: 'toman',
  calendar: 'jalali',
  notifyPending: true,
  weeklyEmail: false,
  sidebarCollapsed: false,
  accentColor: 'blue',
};
