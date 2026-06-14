import type { OrdSettings, OrdSettingsPatch, OrdZone, NewOrdZoneInput, OrdZonePatch } from '@/types';

/**
 * ─────────────────────────────────────────────────────────────────
 * Ordering repository interface — هم‌سبک InventoryRepo.
 *
 * فقط تنظیمات سفارش بیرون‌بر + محدوده‌های ارسال (فاز داده/تنظیمات،
 * بدون UI مشتری). منطق DB در app/api/orders زندگی می‌کند.
 * ───────────────────────────────────────────────────────────────── */

export interface OrderingRepo {
  getSettings(branchId: string): Promise<OrdSettings>;
  updateSettings(branchId: string, patch: OrdSettingsPatch): Promise<OrdSettings>;

  listZones(branchId: string): Promise<OrdZone[]>;
  createZone(input: NewOrdZoneInput): Promise<OrdZone>;
  updateZone(id: string, patch: OrdZonePatch): Promise<OrdZone>;
  deleteZone(id: string): Promise<void>;
}
