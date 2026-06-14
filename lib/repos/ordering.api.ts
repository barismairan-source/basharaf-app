import type { BoardOrder, OrdSettings, OrdSettingsPatch, OrdZone, NewOrdZoneInput, OrdZonePatch, OrderStatus } from '@/types';
import type { OrderingRepo } from './ordering.types';
import { apiFetch } from './api';

/**
 * ─────────────────────────────────────────────────────────────────
 * Ordering API repository — fetch-based (هم‌سبک inventoryRepo).
 * ───────────────────────────────────────────────────────────────── */

export const orderingRepo: OrderingRepo = {
  async getSettings(branchId: string) {
    const data = await apiFetch<{ settings: OrdSettings }>(`/api/orders/settings?branchId=${branchId}`);
    return data.settings;
  },
  async updateSettings(branchId: string, patch: OrdSettingsPatch) {
    const data = await apiFetch<{ settings: OrdSettings }>('/api/orders/settings', {
      method: 'PATCH',
      body: JSON.stringify({ branchId, ...patch }),
    });
    return data.settings;
  },

  async listZones(branchId: string) {
    const data = await apiFetch<{ zones: OrdZone[] }>(`/api/orders/zones?branchId=${branchId}`);
    return data.zones;
  },
  async createZone(input: NewOrdZoneInput) {
    const data = await apiFetch<{ zone: OrdZone }>('/api/orders/zones', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return data.zone;
  },
  async updateZone(id: string, patch: OrdZonePatch) {
    const data = await apiFetch<{ zone: OrdZone }>(`/api/orders/zones/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    return data.zone;
  },
  async deleteZone(id: string) {
    await apiFetch(`/api/orders/zones/${id}`, { method: 'DELETE' });
  },

  async listOrders(branchId?: string) {
    const qs = branchId ? `?branchId=${branchId}` : '';
    const data = await apiFetch<{ orders: BoardOrder[] }>(`/api/orders${qs}`);
    return data.orders;
  },
  async updateOrderStatus(id: string, status: OrderStatus) {
    const data = await apiFetch<{ order: BoardOrder }>(`/api/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return data.order;
  },
};
