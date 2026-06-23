/**
 * تنظیمات کاربر — قابل ویرایش از Settings > تنظیمات سامانه
 */
export type AccentColor = string; // hex مانند '#2563eb'، یا یکی از نام‌های preset قدیمی

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
  accentColor: '#2563eb',
};
