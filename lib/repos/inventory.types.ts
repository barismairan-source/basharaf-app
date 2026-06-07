import type {
  InventoryItem,
  InventoryRecipe,
  InventoryVoucher,
  ForecastResult,
  NewInventoryItemInput,
  NewVoucherInput,
  ProduceInput,
  RecipeCosting,
} from '@/types';

/**
 * ─────────────────────────────────────────────────────────────────
 * Inventory repository interface — هم‌سبک TransactionsRepo.
 *
 * همه‌ی متدها async و fetch-based هستند (پیاده‌سازی در api.ts).
 * منطق DB در API routes زیر app/api/inventory زندگی می‌کند، نه اینجا.
 * Maker-Checker دقیقاً مثل تراکنش‌ها: create→pending، approve/reject→admin.
 * ───────────────────────────────────────────────────────────────── */

export interface InventoryRepo {
  // ── اقلام ──
  listItems(): Promise<InventoryItem[]>;
  createItem(input: NewInventoryItemInput): Promise<InventoryItem>;
  updateItem(id: string, patch: Partial<NewInventoryItemInput>): Promise<InventoryItem>;
  deleteItem(id: string): Promise<void>;

  // ── رسپی‌ها ──
  listRecipes(): Promise<InventoryRecipe[]>;
  saveRecipe(recipe: InventoryRecipe): Promise<InventoryRecipe>;
  deleteRecipe(id: string): Promise<void>;
  recipeCosting(id: string): Promise<RecipeCosting>;

  // ── برگه‌ها (Maker-Checker) ──
  listVouchers(status?: 'pending' | 'approved' | 'rejected'): Promise<InventoryVoucher[]>;
  createVoucher(input: NewVoucherInput): Promise<InventoryVoucher>;
  /** تأیید برگه — فقط SuperAdmin. finalUnitCosts: نگاشت itemId→قیمت‌نهایی هر واحد پایه */
  approveVoucher(id: string, finalUnitCosts: Record<string, number>): Promise<InventoryVoucher>;
  /** رد برگه با دلیل — فقط SuperAdmin */
  rejectVoucher(id: string, reason: string): Promise<InventoryVoucher>;
  deleteVoucher(id: string): Promise<void>;

  // ── تولید نیمه‌آماده ──
  produce(input: ProduceInput): Promise<InventoryVoucher>;

  // ── انبارگردانی ──
  stocktake(itemId: string, countedBase: number, note?: string): Promise<void>;

  // ── پیش‌بینی پخت ──
  forecast(opts: {
    mode?: 'simple' | 'weekday';
    window?: number;
    horizon?: number;
    event?: { type?: string; factorOverride?: number | null; reserved?: Record<string, number> };
  }): Promise<ForecastResult>;
}
