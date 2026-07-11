import type { StateCreator } from 'zustand';
import type { Partner } from '@/types/partner';

export interface PartnersSlice {
  partners: Partner[];
  partnersLoaded: boolean;
  partnersError: string | null;
  loadPartners: () => Promise<void>;
  createPartner: (params: {
    fullName: string;
    phone?: string;
    nationalId?: string;
    note?: string;
  }) => Promise<Partner | null>;
  updatePartner: (
    id: string,
    patch: Partial<Pick<Partner, 'fullName' | 'phone' | 'nationalId' | 'note' | 'isActive'>>
  ) => Promise<boolean>;
  deletePartner: (id: string) => Promise<boolean>;
  addPartnerBranch: (
    partnerId: string,
    params: { branchId: string | null; joinedDate?: string; sharePercent?: string }
  ) => Promise<boolean>;
  removePartnerBranch: (partnerId: string, pbId: string) => Promise<boolean>;
}

export const createPartnersSlice: StateCreator<PartnersSlice> = (set, get) => ({
  partners: [],
  partnersLoaded: false,
  partnersError: null,

  async loadPartners() {
    try {
      const res = await fetch('/api/partners', { credentials: 'include' });
      if (!res.ok) return;
      const { partners } = (await res.json()) as { partners: Partner[] };
      set({ partners, partnersLoaded: true });
    } catch {
      set({ partnersLoaded: true });
    }
  },

  async createPartner(params) {
    try {
      const res = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(params),
      });
      const data = (await res.json()) as { partner?: Partner; error?: string };
      if (!res.ok || !data.partner) throw new Error(data.error ?? 'خطا');
      set(s => ({ partners: [...s.partners, data.partner!], partnersError: null }));
      return data.partner;
    } catch (e) {
      set({ partnersError: e instanceof Error ? e.message : 'خطا' });
      return null;
    }
  },

  async updatePartner(id, patch) {
    const snapshot = get().partners.find(p => p.id === id);
    if (!snapshot) return false;
    set(s => ({ partners: s.partners.map(p => p.id === id ? { ...p, ...patch } : p) }));
    try {
      const res = await fetch(`/api/partners/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error('خطا');
      return true;
    } catch {
      set(s => ({ partners: s.partners.map(p => p.id === id ? snapshot : p) }));
      return false;
    }
  },

  async deletePartner(id) {
    return get().updatePartner(id, { isActive: false });
  },

  async addPartnerBranch(partnerId, params) {
    try {
      const res = await fetch(`/api/partners/${partnerId}/branches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? 'خطا');
      }
      await get().loadPartners();
      return true;
    } catch (e) {
      set({ partnersError: e instanceof Error ? e.message : 'خطا' });
      return false;
    }
  },

  async removePartnerBranch(partnerId, pbId) {
    try {
      const res = await fetch(`/api/partners/${partnerId}/branches/${pbId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('خطا');
      await get().loadPartners();
      return true;
    } catch (e) {
      set({ partnersError: e instanceof Error ? e.message : 'خطا' });
      return false;
    }
  },
});
