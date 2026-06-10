import type {
  InventoryItem,
  InventoryRecipe,
  InventoryVoucher,
  ForecastResult,
  NewInventoryItemInput,
  NewVoucherInput,
  ProduceInput,
  RecipeCosting,
  ExpiryWarning,
} from '@/types';
import type { InventoryRepo } from './inventory.types';

/**
 * ─────────────────────────────────────────────────────────────────
 * Inventory API repository — fetch-based (هم‌سبک transactionsRepo در api.ts).
 *
 * این از همان apiFetch فایل api.ts استفاده می‌کند. اگر apiFetch را export
 * نکرده‌اید، یا این بلوک را داخل api.ts بگذارید (توصیه‌شده) یا apiFetch را
 * export کنید و اینجا import کنید. اینجا فرض شده داخل همان api.ts قرار می‌گیرد
 * و به apiFetch دسترسی دارد.
 * ───────────────────────────────────────────────────────────────── */

// اگر این فایل جداست، این خط را فعال کنید و apiFetch را از api.ts export کنید:
// import { apiFetch } from './api';
import { apiFetch } from './api';

export const inventoryRepo: InventoryRepo = {
  // ── اقلام ──
  async listItems() {
    const data = await apiFetch<{ items: InventoryItem[] }>('/api/inventory/items');
    return data.items;
  },
  async createItem(input: NewInventoryItemInput) {
    const data = await apiFetch<{ item: InventoryItem }>('/api/inventory/items', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return data.item;
  },
  async updateItem(id, patch) {
    const data = await apiFetch<{ item: InventoryItem }>(`/api/inventory/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    return data.item;
  },
  async deleteItem(id) {
    await apiFetch(`/api/inventory/items/${id}`, { method: 'DELETE' });
  },

  // ── رسپی‌ها ──
  async listRecipes() {
    const data = await apiFetch<{ recipes: InventoryRecipe[] }>('/api/inventory/recipes');
    return data.recipes;
  },
  async saveRecipe(recipe) {
    const data = await apiFetch<{ recipe: InventoryRecipe }>('/api/inventory/recipes', {
      method: 'POST',
      body: JSON.stringify(recipe),
    });
    return data.recipe;
  },
  async deleteRecipe(id) {
    await apiFetch(`/api/inventory/recipes/${id}`, { method: 'DELETE' });
  },

  async recipeCosting(id) {
    const data = await apiFetch<{ costing: RecipeCosting }>(`/api/inventory/recipes/${id}/costing`);
    return data.costing;
  },

  // ── برگه‌ها ──
  async listVouchers(status) {
    const q = status ? `?status=${status}` : '';
    const data = await apiFetch<{ vouchers: InventoryVoucher[] }>(`/api/inventory/vouchers${q}`);
    return data.vouchers;
  },
  async createVoucher(input: NewVoucherInput) {
    const data = await apiFetch<{ voucher: InventoryVoucher }>('/api/inventory/vouchers', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return data.voucher;
  },
  async approveVoucher(id, finalUnitCosts, accountId?) {
    const data = await apiFetch<{ voucher: InventoryVoucher }>(
      `/api/inventory/vouchers/${id}/approve`,
      { method: 'POST', body: JSON.stringify({ finalUnitCosts, ...(accountId ? { accountId } : {}) }) }
    );
    return data.voucher;
  },
  async rejectVoucher(id, reason) {
    const data = await apiFetch<{ voucher: InventoryVoucher }>(
      `/api/inventory/vouchers/${id}/reject`,
      { method: 'POST', body: JSON.stringify({ reason }) }
    );
    return data.voucher;
  },

  async deleteVoucher(id) {
    await apiFetch(`/api/inventory/vouchers/${id}`, { method: 'DELETE' });
  },

  // ── تولید ──
  async produce(input: ProduceInput) {
    const data = await apiFetch<{ voucher: InventoryVoucher }>('/api/inventory/produce', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return data.voucher;
  },

  // ── انبارگردانی ──
  async stocktake(itemId, countedBase, note) {
    await apiFetch('/api/inventory/stocktake', {
      method: 'POST',
      body: JSON.stringify({ itemId, countedBase, note: note ?? '' }),
    });
  },

  // ── پیش‌بینی ──
  async forecast(opts) {
    const data = await apiFetch<{ forecast: ForecastResult }>('/api/inventory/forecast', {
      method: 'POST',
      body: JSON.stringify(opts),
    });
    return data.forecast;
  },

  // ── هشدار انقضا ──
  async expiryWarnings() {
    const data = await apiFetch<{ warnings: ExpiryWarning[] }>('/api/inventory/expiry');
    return data.warnings;
  },
};
