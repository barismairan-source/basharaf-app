import type { StateCreator } from 'zustand';
import { DEFAULT_PREFERENCES, type Preferences } from '@/types';

/**
 * PreferencesSlice — تنظیمات کاربر.
 *
 * این slice با persist middleware ذخیره می‌شود تا با refresh
 * صفحه (و در فاز ۱۰ با تغییر دستگاه) باقی بماند.
 */
export interface PreferencesSlice {
  preferences: Preferences;

  updatePreference: <K extends keyof Preferences>(
    key: K,
    value: Preferences[K]
  ) => void;

  resetPreferences: () => void;
}

export const createPreferencesSlice: StateCreator<PreferencesSlice> = (
  set
) => ({
  preferences: DEFAULT_PREFERENCES,

  updatePreference(key, value) {
    set((state) => ({
      preferences: { ...state.preferences, [key]: value },
    }));
  },

  resetPreferences() {
    set({ preferences: DEFAULT_PREFERENCES });
  },
});
