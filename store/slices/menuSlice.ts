import type { StateCreator } from 'zustand';
import type { MenuSection, MenuItem, MenuCategory, MenuSeason, MenuSettings } from '@/types';

/**
 * MenuSlice — مدیریت منوی دیجیتال.
 * داده‌ها از API می‌آیند (Drizzle + JWT)، نه Supabase client مستقیم.
 */
export interface MenuSlice {
  menuSections: MenuSection[];
  menuSettings: MenuSettings | null;
  menuLoaded: boolean;
  menuError: string | null;
  menuSeasons: MenuSeason[];
  menuSeasonsLoaded: boolean;

  loadMenu: () => Promise<void>;
  createMenuItem: (input: Omit<MenuItem, 'id'>) => Promise<boolean>;
  updateMenuItem: (id: string, patch: Partial<Omit<MenuItem, 'id'>>) => Promise<boolean>;
  deleteMenuItem: (id: string) => Promise<boolean>;
  createMenuCategory: (input: Omit<MenuCategory, 'id'>) => Promise<boolean>;
  updateMenuCategory: (id: string, patch: Partial<Omit<MenuCategory, 'id' | 'slug'>>) => Promise<boolean>;
  deleteMenuCategory: (id: string) => Promise<{ ok: boolean; error?: string }>;
  updateMenuSettings: (patch: Partial<MenuSettings>) => Promise<boolean>;
  loadMenuSeasons: () => Promise<void>;
  startMenuSeason: (input: { nameFa: string; nameEn?: string | null; note?: string | null }) => Promise<boolean>;
  updateMenuSeason: (id: string, patch: { nameFa?: string; nameEn?: string | null; note?: string | null }) => Promise<boolean>;
}

export const createMenuSlice: StateCreator<MenuSlice> = (set, get) => ({
  menuSections: [],
  menuSettings: null,
  menuLoaded: false,
  menuError: null,
  menuSeasons: [],
  menuSeasonsLoaded: false,

  async loadMenu() {
    try {
      const res = await fetch('/api/menu', { credentials: 'include', cache: 'no-store' });
      if (!res.ok) return;
      const d = await res.json();
      set({ menuSections: d.sections ?? [], menuSettings: d.settings ?? null, menuLoaded: true });
    } catch {
      set({ menuLoaded: true });
    }
  },

  async createMenuItem(input) {
    try {
      const res = await fetch('/api/menu/items', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('خطا');
      await get().loadMenu();
      return true;
    } catch (e) {
      set({ menuError: e instanceof Error ? e.message : 'خطا' });
      return false;
    }
  },

  async updateMenuItem(id, patch) {
    // optimistic
    set(s => ({
      menuSections: s.menuSections.map(sec => ({
        ...sec,
        items: sec.items.map(it => it.id === id ? { ...it, ...patch } : it),
      })),
    }));
    try {
      const res = await fetch(`/api/menu/items/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error('خطا');
      // اگر دسته عوض شد، reload لازم است
      if (patch.categoryId) await get().loadMenu();
      return true;
    } catch {
      await get().loadMenu();
      return false;
    }
  },

  async deleteMenuItem(id) {
    set(s => ({
      menuSections: s.menuSections.map(sec => ({ ...sec, items: sec.items.filter(it => it.id !== id) })),
    }));
    try {
      const res = await fetch(`/api/menu/items/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('خطا');
      return true;
    } catch {
      await get().loadMenu();
      return false;
    }
  },

  async createMenuCategory(input) {
    try {
      const res = await fetch('/api/menu/categories', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('خطا');
      await get().loadMenu();
      return true;
    } catch (e) {
      set({ menuError: e instanceof Error ? e.message : 'خطا' });
      return false;
    }
  },

  async updateMenuCategory(id, patch) {
    try {
      const res = await fetch(`/api/menu/categories/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error('خطا');
      await get().loadMenu();
      return true;
    } catch {
      return false;
    }
  },

  async deleteMenuCategory(id) {
    try {
      const res = await fetch(`/api/menu/categories/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        return { ok: false, error: d.error ?? 'این دسته آیتم دارد' };
      }
      await get().loadMenu();
      return { ok: true };
    } catch {
      return { ok: false, error: 'خطا' };
    }
  },

  async updateMenuSettings(patch) {
    set(s => ({ menuSettings: s.menuSettings ? { ...s.menuSettings, ...patch } : null }));
    try {
      const res = await fetch('/api/menu/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error('خطا');
      return true;
    } catch {
      await get().loadMenu();
      return false;
    }
  },

  async loadMenuSeasons() {
    try {
      const res = await fetch('/api/menu/seasons', { credentials: 'include', cache: 'no-store' });
      if (!res.ok) return;
      const d = await res.json();
      set({ menuSeasons: d.seasons ?? [], menuSeasonsLoaded: true });
    } catch {
      set({ menuSeasonsLoaded: true });
    }
  },

  async startMenuSeason(input) {
    try {
      const res = await fetch('/api/menu/seasons', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('خطا');
      await get().loadMenuSeasons();
      return true;
    } catch (e) {
      set({ menuError: e instanceof Error ? e.message : 'خطا' });
      return false;
    }
  },

  async updateMenuSeason(id, patch) {
    try {
      const res = await fetch(`/api/menu/seasons/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error('خطا');
      await get().loadMenuSeasons();
      return true;
    } catch {
      return false;
    }
  },
});
