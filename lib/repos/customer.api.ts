import { apiFetch } from './api';
import type { WebCustomer, WebCustomerAddress, WebCustomerAddressInput, WebCustomerOrder } from '@/types/webCustomer';

export const customerRepo = {
  async sendOtp(phone: string): Promise<void> {
    await apiFetch('/api/customer/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  },

  async verifyOtp(phone: string, code: string): Promise<WebCustomer> {
    const data = await apiFetch<{ customer: WebCustomer }>('/api/customer/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    });
    return data.customer;
  },

  async logout(): Promise<void> {
    await apiFetch('/api/customer/auth/logout', { method: 'POST' });
  },

  async getMe(): Promise<WebCustomer | null> {
    try {
      const data = await apiFetch<{ customer: WebCustomer }>('/api/customer/me');
      return data.customer;
    } catch {
      return null;
    }
  },

  async getAddresses(): Promise<WebCustomerAddress[]> {
    const data = await apiFetch<{ addresses: WebCustomerAddress[] }>('/api/customer/addresses');
    return data.addresses;
  },

  async addAddress(input: WebCustomerAddressInput): Promise<WebCustomerAddress> {
    const data = await apiFetch<{ address: WebCustomerAddress }>('/api/customer/addresses', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return data.address;
  },

  async updateAddress(id: string, patch: Partial<WebCustomerAddressInput>): Promise<WebCustomerAddress> {
    const data = await apiFetch<{ address: WebCustomerAddress }>(`/api/customer/addresses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    return data.address;
  },

  async deleteAddress(id: string): Promise<void> {
    await apiFetch(`/api/customer/addresses/${id}`, { method: 'DELETE' });
  },

  async getOrders(): Promise<WebCustomerOrder[]> {
    const data = await apiFetch<{ orders: WebCustomerOrder[] }>('/api/customer/orders');
    return data.orders;
  },
};
