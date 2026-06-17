import type { StateCreator } from 'zustand';
import type { Reservation, ReservationStatus, RestaurantTable } from '@/types';

/**
 * ReservationsSlice — رزرو میز + مدیریت میزها (branch-scoped، CRUD optimistic).
 */
export interface ReservationsSlice {
  reservations: Reservation[];
  reservationsLoaded: boolean;
  reservationsError: string | null;
  tables: RestaurantTable[];
  tablesLoaded: boolean;

  loadReservations: () => Promise<void>;
  createReservation: (params: {
    customerId?: string | null;
    branchId?: string | null;
    tableId?: string | null;
    date: string;
    time: string;
    partySize?: number;
    note?: string | null;
  }) => Promise<Reservation | null>;
  setReservationStatus: (id: string, status: ReservationStatus) => Promise<boolean>;
  deleteReservation: (id: string) => Promise<boolean>;

  loadTables: () => Promise<void>;
  createTable: (params: {
    name: string;
    capacity?: number;
    area?: string | null;
    branchId?: string | null;
  }) => Promise<RestaurantTable | null>;
  deleteTable: (id: string) => Promise<boolean>;
}

export const createReservationsSlice: StateCreator<ReservationsSlice> = (set, get) => ({
  reservations: [],
  reservationsLoaded: false,
  reservationsError: null,
  tables: [],
  tablesLoaded: false,

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
    const tempId = `optimistic-${Date.now()}`;
    const optimistic: Reservation = {
      id: tempId,
      customerId: params.customerId ?? null,
      branchId: params.branchId ?? '',
      tableId: params.tableId ?? null,
      date: params.date,
      time: params.time,
      partySize: params.partySize ?? 1,
      status: 'pending',
      note: params.note ?? null,
      createdBy: '',
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ reservations: [optimistic, ...s.reservations], reservationsError: null }));
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(params),
      });
      const data = (await res.json()) as { reservation?: Reservation; error?: string };
      if (!res.ok || !data.reservation) throw new Error(data.error ?? 'خطا');
      set((s) => ({
        reservations: s.reservations.map((r) => (r.id === tempId ? data.reservation! : r)),
      }));
      return data.reservation;
    } catch (e) {
      set((s) => ({
        reservations: s.reservations.filter((r) => r.id !== tempId),
        reservationsError: e instanceof Error ? e.message : 'خطا',
      }));
      return null;
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
});
