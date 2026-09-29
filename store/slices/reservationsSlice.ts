import type { StateCreator } from 'zustand';
import type { Reservation, ReservationStatus, RestaurantTable, RestaurantTableBlock, ReservationSettingsDTO } from '@/types';

/**
 * ReservationsSlice — رزرو میز + مدیریت میزها (branch-scoped، CRUD optimistic).
 */
export interface ReservationsSlice {
  reservations: Reservation[];
  reservationsLoaded: boolean;
  reservationsError: string | null;
  tables: RestaurantTable[];
  tablesLoaded: boolean;
  reservationSettings: ReservationSettingsDTO | null;
  tableBlocks: RestaurantTableBlock[];
  tableBlocksLoaded: boolean;

  loadReservations: () => Promise<void>;
  createReservation: (params: {
    customerId?: string | null;
    branchId?: string | null;
    tableId?: string | null;
    date: string;
    time: string;
    partySize?: number;
    note?: string | null;
    guestName?: string | null;
    guestPhone?: string | null;
    bookerName?: string | null;
  }) => Promise<Reservation | { error: string } | null>;
  updateReservation: (id: string, patch: {
    tableId?: string | null;
    date?: string;
    time?: string;
    partySize?: number;
    note?: string | null;
  }) => Promise<{ ok: boolean; error?: string }>;
  setReservationStatus: (id: string, status: ReservationStatus) => Promise<boolean>;
  deleteReservation: (id: string) => Promise<boolean>;

  loadTables: () => Promise<void>;
  createTable: (params: {
    name: string;
    capacity?: number;
    area?: string | null;
    branchId?: string | null;
    isSocial?: boolean;
  }) => Promise<RestaurantTable | null>;
  deleteTable: (id: string) => Promise<boolean>;

  loadReservationSettings: (branchId: string) => Promise<void>;
  saveReservationSettings: (
    branchId: string | null,
    patch: Omit<ReservationSettingsDTO, 'id' | 'branchId' | 'updatedAt'>,
  ) => Promise<boolean>;

  loadTableBlocks: (date?: string) => Promise<void>;
  createTableBlock: (params: {
    tableId: string;
    date: string;
    startTime?: string | null;
    endTime?: string | null;
    reason?: string | null;
  }) => Promise<{ ok: boolean; error?: string }>;
  deleteTableBlock: (id: string) => Promise<boolean>;
}

export const createReservationsSlice: StateCreator<ReservationsSlice> = (set, get) => ({
  reservations: [],
  reservationsLoaded: false,
  reservationsError: null,
  tables: [],
  tablesLoaded: false,
  reservationSettings: null,
  tableBlocks: [],
  tableBlocksLoaded: false,

  async loadReservations() {
    try {
      const res = await fetch('/api/reservations', { credentials: 'include' });
      if (!res.ok) return;
      const { reservations } = (await res.json()) as { reservations: Reservation[] };
      set({ reservations, reservationsLoaded: true });
    } catch {
      set({ reservationsLoaded: true });
    }
  },

  async createReservation(params) {
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(params),
      });
      const data = (await res.json()) as { reservation?: Reservation; error?: string };
      if (!res.ok || !data.reservation) {
        set({ reservationsError: data.error ?? 'خطا' });
        return { error: data.error ?? 'خطا' };
      }
      set((s) => ({ reservations: [data.reservation!, ...s.reservations], reservationsError: null }));
      return data.reservation;
    } catch {
      set({ reservationsError: 'خطا در ارتباط با سرور' });
      return { error: 'خطا در ارتباط با سرور' };
    }
  },

  async updateReservation(id, patch) {
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(patch),
      });
      const data = (await res.json()) as { reservation?: Reservation; error?: string };
      if (!res.ok || !data.reservation) return { ok: false, error: data.error ?? 'خطا' };
      set((s) => ({ reservations: s.reservations.map((r) => r.id === id ? data.reservation! : r) }));
      return { ok: true };
    } catch {
      return { ok: false, error: 'خطا در ارتباط با سرور' };
    }
  },

  async setReservationStatus(id, status) {
    const snapshot = get().reservations.find((r) => r.id === id);
    if (!snapshot) return false;
    set((s) => ({
      reservations: s.reservations.map((r) => (r.id === id ? { ...r, status } : r)),
    }));
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('خطا');
      return true;
    } catch {
      set((s) => ({ reservations: s.reservations.map((r) => (r.id === id ? snapshot : r)) }));
      return false;
    }
  },

  async deleteReservation(id) {
    const snapshot = get().reservations.find((r) => r.id === id);
    if (!snapshot) return false;
    set((s) => ({ reservations: s.reservations.filter((r) => r.id !== id) }));
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('خطا');
      return true;
    } catch {
      set((s) => ({ reservations: [snapshot, ...s.reservations] }));
      return false;
    }
  },

  async loadTables() {
    try {
      const res = await fetch('/api/tables', { credentials: 'include' });
      if (!res.ok) return;
      const { tables } = (await res.json()) as { tables: RestaurantTable[] };
      set({ tables, tablesLoaded: true });
    } catch {
      set({ tablesLoaded: true });
    }
  },

  async createTable(params) {
    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(params),
      });
      const data = (await res.json()) as { table?: RestaurantTable; error?: string };
      if (!res.ok || !data.table) throw new Error(data.error ?? 'خطا');
      set((s) => ({ tables: [...s.tables, data.table!] }));
      return data.table;
    } catch {
      return null;
    }
  },

  async deleteTable(id) {
    const snapshot = get().tables;
    set((s) => ({ tables: s.tables.filter((t) => t.id !== id) }));
    try {
      const res = await fetch(`/api/tables/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('خطا');
      return true;
    } catch {
      set({ tables: snapshot });
      return false;
    }
  },

  async loadReservationSettings(branchId) {
    try {
      const qs = new URLSearchParams({ branchId });
      const res = await fetch(`/api/reservations/settings?${qs}`, { credentials: 'include' });
      if (!res.ok) return;
      const { settings } = (await res.json()) as { settings: ReservationSettingsDTO };
      set({ reservationSettings: settings });
    } catch {
      /* ignore */
    }
  },

  async saveReservationSettings(branchId, patch) {
    try {
      const res = await fetch('/api/reservations/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ branchId: branchId ?? undefined, ...patch }),
      });
      if (!res.ok) return false;
      const { settings } = (await res.json()) as { settings: ReservationSettingsDTO };
      set({ reservationSettings: settings });
      return true;
    } catch {
      return false;
    }
  },

  async loadTableBlocks(date) {
    try {
      const qs = date ? `?${new URLSearchParams({ date })}` : '';
      const res = await fetch(`/api/reservations/blocks${qs}`, { credentials: 'include' });
      if (!res.ok) return;
      const { blocks } = (await res.json()) as { blocks: RestaurantTableBlock[] };
      set({ tableBlocks: blocks, tableBlocksLoaded: true });
    } catch {
      set({ tableBlocksLoaded: true });
    }
  },

  async createTableBlock(params) {
    try {
      const res = await fetch('/api/reservations/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(params),
      });
      const data = (await res.json()) as { block?: RestaurantTableBlock; error?: string };
      if (!res.ok || !data.block) return { ok: false, error: data.error ?? 'خطا' };
      set((s) => ({ tableBlocks: [...s.tableBlocks, data.block!] }));
      return { ok: true };
    } catch {
      return { ok: false, error: 'خطا در ارتباط با سرور' };
    }
  },

  async deleteTableBlock(id) {
    const snapshot = get().tableBlocks;
    set((s) => ({ tableBlocks: s.tableBlocks.filter((b) => b.id !== id) }));
    try {
      const res = await fetch(`/api/reservations/blocks/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('خطا');
      return true;
    } catch {
      set({ tableBlocks: snapshot });
      return false;
    }
  },
});
