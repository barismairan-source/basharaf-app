import type { StateCreator } from 'zustand';
import type { Equipment, MaintenanceLog, NewEquipmentInput, NewMaintenanceLogInput, PurchaseOrder, NewPurchaseOrderInput, UpdatePurchaseOrderInput, ReceivePurchaseOrderInput, ReceivePurchaseOrderResult } from '@/types';

/**
 * OperationsSlice — تجهیزات/نگهداری (فاز ۲) + سفارش خرید (فاز ۳، Part 2).
 * هم‌سبک ContactsSlice: optimistic create + snapshot/rollback برای update/delete.
 */
export interface OperationsSlice {
  equipment: Equipment[];
  equipmentLoaded: boolean;
  equipmentError: string | null;
  maintenanceLogs: MaintenanceLog[];
  maintenanceLoaded: boolean;
  maintenanceError: string | null;

  loadEquipment: () => Promise<void>;
  createEquipment: (input: NewEquipmentInput) => Promise<Equipment | null>;
  updateEquipment: (id: string, patch: Partial<Pick<Equipment, 'code' | 'name' | 'category' | 'status' | 'purchaseDate' | 'purchaseCost' | 'warrantyExpiry' | 'note'>>) => Promise<boolean>;
  retireEquipment: (id: string) => Promise<boolean>;

  loadMaintenanceLogs: (equipmentId: string) => Promise<void>;
  createMaintenanceLog: (input: NewMaintenanceLogInput) => Promise<MaintenanceLog | null>;

  purchaseOrders: PurchaseOrder[];
  poLoaded: boolean;
  poError: string | null;
  loadPurchaseOrders: () => Promise<void>;
  createPurchaseOrder: (input: NewPurchaseOrderInput) => Promise<PurchaseOrder | null>;
  updatePurchaseOrder: (id: string, patch: UpdatePurchaseOrderInput) => Promise<PurchaseOrder | null>;
  deletePurchaseOrder: (id: string) => Promise<boolean>;
  receivePurchaseOrder: (id: string, input: ReceivePurchaseOrderInput) => Promise<ReceivePurchaseOrderResult | null>;
}

export const createOperationsSlice: StateCreator<OperationsSlice> = (set, get) => ({
  equipment: [],
  equipmentLoaded: false,
  equipmentError: null,
  maintenanceLogs: [],
  maintenanceLoaded: false,
  maintenanceError: null,
  purchaseOrders: [],
  poLoaded: false,
  poError: null,

  async loadEquipment() {
    try {
      const res = await fetch('/api/equipment', { credentials: 'include' });
      if (!res.ok) return;
      const { equipment } = (await res.json()) as { equipment: Equipment[] };
      set({ equipment, equipmentLoaded: true });
    } catch {
      set({ equipmentLoaded: true });
    }
  },

  async createEquipment(input) {
    const tempId = `optimistic-${Date.now()}`;
    const optimistic: Equipment = {
      id: tempId,
      branchId: input.branchId,
      code: input.code,
      name: input.name,
      category: input.category ?? 'general',
      status: 'active',
      purchaseDate: input.purchaseDate ?? null,
      purchaseCost: input.purchaseCost ?? 0,
      warrantyExpiry: input.warrantyExpiry ?? null,
      note: input.note ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set(s => ({ equipment: [optimistic, ...s.equipment], equipmentError: null }));

    try {
      const res = await fetch('/api/equipment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify(input),
      });
      const data = (await res.json()) as { equipment?: Equipment; error?: string };
      if (!res.ok || !data.equipment) throw new Error(data.error ?? 'خطا');
      set(s => ({ equipment: s.equipment.map(e => e.id === tempId ? data.equipment! : e) }));
      return data.equipment;
    } catch (e) {
      set(s => ({ equipment: s.equipment.filter(e => e.id !== tempId), equipmentError: e instanceof Error ? e.message : 'خطا' }));
      return null;
    }
  },

  async updateEquipment(id, patch) {
    const snapshot = get().equipment.find(e => e.id === id);
    if (!snapshot) return false;
    set(s => ({ equipment: s.equipment.map(e => e.id === id ? { ...e, ...patch } : e) }));
    try {
      const res = await fetch(`/api/equipment/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error('خطا');
      return true;
    } catch {
      set(s => ({ equipment: s.equipment.map(e => e.id === id ? snapshot : e) }));
      return false;
    }
  },

  async retireEquipment(id) {
    const snapshot = get().equipment.find(e => e.id === id);
    if (!snapshot) return false;
    set(s => ({ equipment: s.equipment.map(e => e.id === id ? { ...e, status: 'retired' as const } : e) }));
    try {
      const res = await fetch(`/api/equipment/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('خطا');
      return true;
    } catch {
      set(s => ({ equipment: s.equipment.map(e => e.id === id ? snapshot : e) }));
      return false;
    }
  },

  async loadMaintenanceLogs(equipmentId) {
    try {
      const res = await fetch(`/api/maintenance?equipmentId=${equipmentId}`, { credentials: 'include' });
      if (!res.ok) return;
      const { logs } = (await res.json()) as { logs: MaintenanceLog[] };
      set({ maintenanceLogs: logs, maintenanceLoaded: true });
    } catch {
      set({ maintenanceLoaded: true });
    }
  },

  async createMaintenanceLog(input) {
    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify(input),
      });
      const data = (await res.json()) as { log?: MaintenanceLog; error?: string };
      if (!res.ok || !data.log) throw new Error(data.error ?? 'خطا');
      set(s => ({ maintenanceLogs: [data.log!, ...s.maintenanceLogs] }));
      return data.log;
    } catch (e) {
      set({ maintenanceError: e instanceof Error ? e.message : 'خطا' });
      return null;
    }
  },

  async loadPurchaseOrders() {
    try {
      const res = await fetch('/api/purchase-orders', { credentials: 'include' });
      if (!res.ok) return;
      const { orders } = (await res.json()) as { orders: PurchaseOrder[] };
      set({ purchaseOrders: orders, poLoaded: true });
    } catch {
      set({ poLoaded: true });
    }
  },

  async createPurchaseOrder(input) {
    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify(input),
      });
      const data = (await res.json()) as { order?: PurchaseOrder; error?: string };
      if (!res.ok || !data.order) throw new Error(data.error ?? 'خطا');
      set(s => ({ purchaseOrders: [data.order!, ...s.purchaseOrders] }));
      return data.order;
    } catch (e) {
      set({ poError: e instanceof Error ? e.message : 'خطا' });
      return null;
    }
  },

  async updatePurchaseOrder(id, patch) {
    try {
      const res = await fetch(`/api/purchase-orders/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify(patch),
      });
      const data = (await res.json()) as { order?: PurchaseOrder; error?: string };
      if (!res.ok || !data.order) throw new Error(data.error ?? 'خطا');
      set(s => ({ purchaseOrders: s.purchaseOrders.map(o => o.id === id ? data.order! : o) }));
      return data.order;
    } catch (e) {
      set({ poError: e instanceof Error ? e.message : 'خطا' });
      return null;
    }
  },

  async deletePurchaseOrder(id) {
    try {
      const res = await fetch(`/api/purchase-orders/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? 'خطا');
      }
      set(s => ({ purchaseOrders: s.purchaseOrders.filter(o => o.id !== id) }));
      return true;
    } catch (e) {
      set({ poError: e instanceof Error ? e.message : 'خطا' });
      return false;
    }
  },

  async receivePurchaseOrder(id, input) {
    try {
      const res = await fetch(`/api/purchase-orders/${id}/receive`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify(input),
      });
      const data = (await res.json()) as { order?: PurchaseOrder; voucherNo?: string | null; transactionId?: string; hasDiscrepancy?: boolean; error?: string };
      if (!res.ok || !data.order || !data.transactionId) throw new Error(data.error ?? 'خطا');
      set(s => ({ purchaseOrders: s.purchaseOrders.map(o => o.id === id ? data.order! : o) }));
      return { order: data.order, voucherNo: data.voucherNo ?? null, transactionId: data.transactionId, hasDiscrepancy: data.hasDiscrepancy ?? false };
    } catch (e) {
      set({ poError: e instanceof Error ? e.message : 'خطا' });
      return null;
    }
  },
});
