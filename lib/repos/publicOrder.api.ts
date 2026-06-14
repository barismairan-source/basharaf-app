import { apiFetch } from './api';
import type { PublicOrderRepo } from './publicOrder.types';
import type { PublicOrderMenu } from '@/types';

export const publicOrderRepo: PublicOrderRepo = {
  async getMenu() {
    return apiFetch<PublicOrderMenu>('/api/public/order/menu', { cache: 'no-store' });
  },
};
