import type { StateCreator } from 'zustand';
import { apiFetch } from '@/lib/repos/api';

/**
 * AppSettingsSlice — متن‌های داینامیک UI.
 *
 * این slice تنظیمات را از API می‌گیرد و cache می‌کند.
 * هر component می‌تواند با useSetting(key, fallback) مقدار را بخواند.
 *
 * Optimistic: تغییر فوری در UI، سپس API call در background.
 */

export interface AppSettingsSlice {
  /** کل تنظیمات به شکل { key: value } */
  appSettings: Record<string, string>;
  appSettingsLoaded: boolean;

  /** خواندن یک تنظیم با fallback */
  getSetting: (key: string, fallback?: string) => string;

  /** آپدیت یک تنظیم (SuperAdmin only) — Optimistic */
  updateSetting: (key: string, value: string) => Promise<boolean>;

  /** بارگذاری از API */
  _loadAppSettings: () => Promise<void>;
}

export const createAppSettingsSlice: StateCreator<AppSettingsSlice> =
  (set, get) => ({
    appSettings: {},
    appSettingsLoaded: false,

    getSetting(key, fallback = '') {
      return get().appSettings[key] ?? fallback;
    },

    async _loadAppSettings() {
      try {
        const { settings } = await apiFetch<{ settings: Record<string, string> }>('/api/settings');
        set({ appSettings: settings, appSettingsLoaded: true });
      } catch {
        // اگر fail شد (شامل 401 که خودش redirect می‌کند)، fallback‌های hardcode
        set({ appSettingsLoaded: true });
      }
    },

    async updateSetting(key, value) {
      const prev = get().appSettings[key];

      // Optimistic — فوری آپدیت
      set((s) => ({
        appSettings: { ...s.appSettings, [key]: value },
      }));

      try {
        await apiFetch('/api/settings', {
          method: 'PATCH',
          body: JSON.stringify({ key, value }),
        });
        return true;
      } catch {
        // Rollback
        set((s) => ({
          appSettings: { ...s.appSettings, [key]: prev ?? '' },
        }));
        return false;
      }
    },
  });
