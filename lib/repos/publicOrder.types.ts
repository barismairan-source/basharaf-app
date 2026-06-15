import type { CreateOrderInput, PublicOrder, PublicOrderMenu } from '@/types';

export interface PublicOrderRepo {
  getMenu(): Promise<PublicOrderMenu>;
  createOrder(input: CreateOrderInput): Promise<PublicOrder>;
  getOrderByToken(token: string): Promise<PublicOrder>;
  requestPayment(trackToken: string): Promise<{ url: string }>;
}
