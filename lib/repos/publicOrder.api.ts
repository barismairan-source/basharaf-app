import { apiFetch } from './api';
import type { PublicOrderRepo } from './publicOrder.types';
import type { PublicOrder, PublicOrderMenu } from '@/types';

export const publicOrderRepo: PublicOrderRepo = {
  async getMenu() {
    return apiFetch<PublicOrderMenu>('/api/public/order/menu', { cache: 'no-store' });
  },

  async createOrder(input) {
    const data = await apiFetch<{ order: PublicOrder }>('/api/public/order/create', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return data.order;
  },

  async getOrderByToken(token) {
    const data = await apiFetch<{ order: PublicOrder }>(
      `/api/public/order/track/${token}`,
      { cache: 'no-store' }
    );
    return data.order;
  },
};
