import type { BoardOrder, OrdSettings, OrdSettingsPatch, OrdZone, NewOrdZoneInput, OrdZonePatch, OrderStatus } from '@/types';

/**
 * ─────────────────────────────────────────────────────────────────
 * Ordering repository interface — هم‌سبک InventoryRepo.
 *
 * تنظیمات سفارش بیرون‌بر + محدوده‌های ارسال + تخته‌ی عملیاتی پرسنل
 * (/orders). منطق DB در app/api/orders زندگی می‌کند.
 * ───────────────────────────────────────────────────────────────── */

export interface OrderingRepo {
  getSettings(branchId: string): Promise<OrdSettings>;
  updateSettings(branchId: string, patch: OrdSettingsPatch): Promise<OrdSettings>;

  listZones(branchId: string): Promise<OrdZone[]>;
  createZone(input: NewOrdZoneInput): Promise<OrdZone>;
  updateZone(id: string, patch: OrdZonePatch): Promise<OrdZone>;
  deleteZone(id: string): Promise<void>;

  listOrders(branchId?: string): Promise<BoardOrder[]>;
  updateOrderStatus(id: string, status: OrderStatus): Promise<BoardOrder>;
}
