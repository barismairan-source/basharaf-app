import type { StateCreator } from 'zustand';
import type { HubItem, HubSettings } from '@/types';

/**
 * HubSlice — مدیریت صفحه‌ی لینک basharaf.me/safasity.
 * برای پنل ادمین همیشه با ?all=1 لود می‌شود تا لینک‌های مخفی هم دیده شوند.
 */
export interface HubSlice {
  hubItems: HubItem[];
  hubSettings: HubSettings | null;
  hubLoaded: boolean;
  hubError: string | null;

  loadHub: () => Promise<void>;
  createHubItem: (input: Omit<HubItem, 'id'>) => Promise<boolean>;
  updateHubItem: (id: string, patch: Partial<Omit<HubItem, 'id'>>) => Promise<boolean>;
  deleteHubItem: (id: string) => Promise<boolean>;
  moveHubItem: (id: string, direction: 'up' | 'down') => Promise<boolean>;
  updateHubSettings: (patch: Partial<HubSettings>) => Promise<boolean>;
}

export const createHubSlice: StateCreator<HubSlice> = (set, get) => ({
  hubItems: [],
  hubSettings: null,
  hubLoaded: false,
  hubError: null,

  async loadHub() {
    try {
      const res = await fetch('/api/hub?all=1', { credentials: 'include', cache: 'no-store' });
      if (!res.ok) return;
      const d = await res.json();
      set({ hubItems: d.items ?? [], hubSettings: d.settings ?? null, hubLoaded: true });
    } catch {
      set({ hubLoaded: true });
    }
  },

  async createHubItem(input) {
    try {
      const res = await fetch('/api/hub/items', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('خطا');
      await get().loadHub();
      return true;
    } catch (e) {
      set({ hubError: e instanceof Error ? e.message : 'خطا' });
      return false;
    }
  },

  async updateHubItem(id, patch) {
    set(s => ({ hubItems: s.hubItems.map(it => it.id === id ? { ...it, ...patch } : it) }));
    try {
      const res = await fetch(`/api/hub/items/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error('خطا');
      return true;
    } catch {
      await get().loadHub();
      return false;
    }
  },

  async deleteHubItem(id) {
    set(s => ({ hubItems: s.hubItems.filter(it => it.id !== id) }));
    try {
      const res = await fetch(`/api/hub/items/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('خطا');
      return true;
    } catch {
      await get().loadHub();
      return false;
    }
  },

  async moveHubItem(id, direction) {
    const items = [...get().hubItems].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = items.findIndex(it => it.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (idx === -1 || swapIdx < 0 || swapIdx >= items.length) return false;
    const a = items[idx]!, b = items[swapIdx]!;
    const [aOrder, bOrder] = [a.sortOrder, b.sortOrder];
    set(s => ({
      hubItems: s.hubItems.map(it => {
        if (it.id === a.id) return { ...it, sortOrder: bOrder };
        if (it.id === b.id) return { ...it, sortOrder: aOrder };
        return it;
      }),
    }));
    const [okA, okB] = await Promise.all([
      fetch(`/api/hub/items/${a.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ sortOrder: bOrder }) }),
      fetch(`/api/hub/items/${b.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ sortOrder: aOrder }) }),
    ]);
    if (!okA.ok || !okB.ok) { await get().loadHub(); return false; }
    return true;
  },

  async updateHubSettings(patch) {
    set(s => ({ hubSettings: s.hubSettings ? { ...s.hubSettings, ...patch } : null }));
    try {
      const res = await fetch('/api/hub/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error('خطا');
      return true;
    } catch {
      await get().loadHub();
      return false;
    }
  },
});
