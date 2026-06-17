import type { StateCreator } from 'zustand';
import type { Customer } from '@/types';

/**
 * CustomersSlice — مدیریت مشتریان (CRUD optimistic، مستقیم fetch به /api/customers).
 * addLoyalty امتیاز را سمت سرور (اتمیک) تغییر می‌دهد و مانده/سطح را در استور به‌روز می‌کند.
 */
export interface CustomersSlice {
  customers: Customer[];
  customersLoaded: boolean;
  customersError: string | null;
  loadCustomers: () => Promise<void>;
  createCustomer: (params: {
    name: string;
    phone: string;
    birthday?: string | null;
    homeBranchId?: string | null;
    contactId?: string | null;
    note?: string | null;
  }) => Promise<Customer | null>;
  updateCustomer: (
    id: string,
    patch: Partial<
      Pick<Customer, 'name' | 'phone' | 'birthday' | 'contactId' | 'note' | 'tier' | 'isActive'>
    >,
  ) => Promise<boolean>;
  deleteCustomer: (id: string) => Promise<boolean>;
  addLoyalty: (
    customerId: string,
    params: {
      type: 'earn' | 'redeem' | 'adjust';
      points?: number;
      amount?: number;
      reason?: string;
      refTransactionId?: string | null;
    },
  ) => Promise<{ points: number; tier: string } | null>;
}

export const createCustomersSlice: StateCreator<CustomersSlice> = (set, get) => ({
  customers: [],
  customersLoaded: false,
  customersError: null,

  async loadCustomers() {
    try {
      const res = await fetch('/api/customers', { credentials: 'include' });
      if (!res.ok) return;
      const { customers } = (await res.json()) as { customers: Customer[] };
      set({ customers, customersLoaded: true });
    } catch {
      set({ customersLoaded: true });
    }
  },

  async createCustomer(params) {
    const tempId = `optimistic-${Date.now()}`;
    const optimistic: Customer = {
      id: tempId,
      name: params.name,
      phone: params.phone,
      birthday: params.birthday ?? null,
      homeBranchId: params.homeBranchId ?? null,
      contactId: params.contactId ?? null,
      tier: 'bronze',
      points: 0,
      visitCount: 0,
      totalSpent: 0,
      note: params.note ?? null,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((s) => ({ customers: [optimistic, ...s.customers], customersError: null }));

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(params),
      });
      const data = (await res.json()) as { customer?: Customer; error?: string };
      if (!res.ok || !data.customer) throw new Error(data.error ?? 'خطا');
      set((s) => ({
        customers: s.customers.map((c) => (c.id === tempId ? data.customer! : c)),
      }));
      return data.customer;
    } catch (e) {
      set((s) => ({
        customers: s.customers.filter((c) => c.id !== tempId),
        customersError: e instanceof Error ? e.message : 'خطا',
      }));
      return null;
    }
  },

  async updateCustomer(id, patch) {
    const snapshot = get().customers.find((c) => c.id === id);
    if (!snapshot) return false;
    set((s) => ({
      customers: s.customers.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error('خطا');
      return true;
    } catch {
      set((s) => ({ customers: s.customers.map((c) => (c.id === id ? snapshot : c)) }));
      return false;
    }
  },

  async deleteCustomer(id) {
    const snapshot = get().customers.find((c) => c.id === id);
    if (!snapshot) return false;
    set((s) => ({ customers: s.customers.filter((c) => c.id !== id) }));
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('خطا');
      return true;
    } catch {
      set((s) => ({ customers: [snapshot, ...s.customers] }));
      return false;
    }
  },

  async addLoyalty(customerId, params) {
    // غیر optimistic — مانده‌ی نهایی را سرور (اتمیک) محاسبه می‌کند.
    try {
      const res = await fetch(`/api/customers/${customerId}/loyalty`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(params),
      });
      const data = (await res.json()) as { points?: number; tier?: string; error?: string };
      if (!res.ok || data.points == null) throw new Error(data.error ?? 'خطا');
      const points = data.points;
      const tier = data.tier ?? '';
      set((s) => ({
        customers: s.customers.map((c) =>
          c.id === customerId ? { ...c, points, tier: tier || c.tier } : c,
        ),
      }));
      return { points, tier };
    } catch {
      return null;
    }
  },
});
