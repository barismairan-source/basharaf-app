import { schema } from './client';
import type { TaskFrequency, UserRole } from '@/types';

type EquipmentRow = typeof schema.equipment.$inferSelect;
type MaintenanceLogRow = typeof schema.maintenanceLogs.$inferSelect;
type PurchaseOrderRow = typeof schema.purchaseOrders.$inferSelect;
type PurchaseOrderItemRow = typeof schema.purchaseOrderItems.$inferSelect;
type TaskTemplateRow = typeof schema.taskTemplates.$inferSelect;
type TaskInstanceRow = typeof schema.taskInstances.$inferSelect;

/**
 * BigInt → Number conversion (مطابق lib/db/serializers.ts).
 */
function toNum(v: bigint | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === 'bigint' ? Number(v) : v;
}

/** numeric ستون‌ها در drizzle/postgres به‌صورت string برمی‌گردند. */
function toFloat(v: string | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === 'string' ? parseFloat(v) : v;
}

export function rowToEquipment(row: EquipmentRow) {
  return {
    id: row.id,
    branchId: row.branchId,
    code: row.code,
    name: row.name,
    category: row.category,
    status: row.status,
    purchaseDate: row.purchaseDate,
    purchaseCost: toNum(row.purchaseCost),
    warrantyExpiry: row.warrantyExpiry,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function rowToMaintenanceLog(row: MaintenanceLogRow) {
  return {
    id: row.id,
    equipmentId: row.equipmentId,
    type: row.type,
    date: row.date,
    cost: toNum(row.cost),
    vendor: row.vendor,
    note: row.note,
    refTransactionId: row.refTransactionId,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
  };
}

export function rowToPurchaseOrderItem(row: PurchaseOrderItemRow) {
  return {
    id: row.id,
    orderId: row.orderId,
    inventoryItemId: row.inventoryItemId,
    description: row.description,
    qty: toFloat(row.qty),
    unitCost: toNum(row.unitCost),
    totalCost: toNum(row.totalCost),
  };
}

export function rowToPurchaseOrder(row: PurchaseOrderRow, items: PurchaseOrderItemRow[]) {
  return {
    id: row.id,
    no: row.no,
    branchId: row.branchId,
    supplierId: row.supplierId,
    status: row.status,
    expectedDate: row.expectedDate,
    note: row.note,
    estTotal: toNum(row.estTotal),
    finalTotal: row.finalTotal == null ? null : toNum(row.finalTotal),
    refTransactionId: row.refTransactionId,
    refInvVoucherId: row.refInvVoucherId,
    receivedBy: row.receivedBy,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    items: items.map(rowToPurchaseOrderItem),
  };
}

export function rowToTaskTemplate(row: TaskTemplateRow) {
  return {
    id: row.id,
    branchId: row.branchId,
    title: row.title,
    category: row.category,
    assignedRole: row.assignedRole as UserRole,
    frequency: row.frequency as TaskFrequency,
    estimatedMinutes: row.estimatedMinutes,
    checklistJson: (row.checklistJson as string[] | null) ?? null,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function rowToTaskInstance(
  row: TaskInstanceRow,
  template: { title: string; category: string; estimatedMinutes: number } | null,
  assignedUserName: string | null
) {
  return {
    id: row.id,
    templateId: row.templateId,
    branchId: row.branchId,
    assignedUserId: row.assignedUserId,
    assignedUserName,
    dueDate: row.dueDate,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    status: row.status,
    note: row.note,
    title: template?.title ?? 'وظیفه',
    category: template?.category ?? 'ops',
    estimatedMinutes: template?.estimatedMinutes ?? 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
