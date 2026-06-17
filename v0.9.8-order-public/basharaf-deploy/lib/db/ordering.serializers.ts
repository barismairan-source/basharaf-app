import { schema } from './client';

type OrdSettingsRow = typeof schema.ordSettings.$inferSelect;
type OrdZoneRow = typeof schema.ordZones.$inferSelect;

/**
 * BigInt → Number conversion (مطابق lib/db/operations.serializers.ts).
 */
function toNum(v: bigint | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === 'bigint' ? Number(v) : v;
}

export function rowToOrdSettings(row: OrdSettingsRow) {
  return {
    id: row.id,
    branchId: row.branchId,
    isOpen: row.isOpen,
    openTime: row.openTime,
    closeTime: row.closeTime,
    deliveryEnabled: row.deliveryEnabled,
    pickupEnabled: row.pickupEnabled,
    payCash: row.payCash,
    payOnline: row.payOnline,
    minOrder: toNum(row.minOrder),
    prepBufferMin: row.prepBufferMin,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function rowToOrdZone(row: OrdZoneRow) {
  return {
    id: row.id,
    branchId: row.branchId,
    name: row.name,
    deliveryFee: toNum(row.deliveryFee),
    minOrder: toNum(row.minOrder),
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
