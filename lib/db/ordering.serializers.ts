import { schema } from './client';

type OrdSettingsRow = typeof schema.ordSettings.$inferSelect;
type OrdZoneRow = typeof schema.ordZones.$inferSelect;
type OrderRow = typeof schema.orders.$inferSelect;
type OrderLineRow = typeof schema.orderLines.$inferSelect;

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

/**
 * سفارش عمومی (پاسخ ثبت سفارش + صفحه‌ی رهگیری) — order + order_lines (snapshot)
 * + نام محدوده‌ی ارسال (در صورت وجود zone_id).
 */
export function rowToPublicOrder(order: OrderRow, lines: OrderLineRow[], zoneName: string | null) {
  return {
    id: order.id,
    orderNo: order.orderNo,
    trackToken: order.trackToken,
    status: order.status,
    serviceType: order.serviceType,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    address: order.address,
    zoneName,
    pickupTime: order.pickupTime,
    subtotal: toNum(order.subtotal),
    deliveryFee: toNum(order.deliveryFee),
    discount: toNum(order.discount),
    total: toNum(order.total),
    payMethod: order.payMethod,
    payStatus: order.payStatus,
    jalaliDate: order.jalaliDate,
    note: order.note,
    createdAt: order.createdAt.toISOString(),
    lines: lines.map((l) => ({
      itemName: l.itemName,
      unitPrice: toNum(l.unitPrice),
      qty: l.qty,
      lineTotal: toNum(l.lineTotal),
    })),
  };
}
