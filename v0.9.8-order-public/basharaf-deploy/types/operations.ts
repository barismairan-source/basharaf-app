// ═══════════════════════════════════════════════════════════════════
//  این تایپ‌ها را به فایل types اصلی پروژه (@/types) اضافه کنید.
//  هم‌سبک Transaction / Inventory موجود — فاز ۲ ماژول عملیات (تجهیزات/نگهداری).
// ═══════════════════════════════════════════════════════════════════

import type { UserRole } from './user';

export type EquipmentStatus = 'active' | 'maintenance' | 'retired';
export type MaintType = 'preventive' | 'corrective' | 'inspection';

export interface Equipment {
  id: string;
  branchId: string;
  code: string;
  name: string;
  category: string;
  status: EquipmentStatus;
  purchaseDate: string | null; // Jalali
  purchaseCost: number;
  warrantyExpiry: string | null; // Jalali
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewEquipmentInput {
  branchId: string;
  code: string;
  name: string;
  category?: string;
  purchaseDate?: string | null;
  purchaseCost?: number;
  warrantyExpiry?: string | null;
  note?: string | null;
}

export interface MaintenanceLog {
  id: string;
  equipmentId: string;
  type: MaintType;
  date: string; // Jalali
  cost: number;
  vendor: string | null;
  note: string;
  refTransactionId: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface NewMaintenanceLogInput {
  equipmentId: string;
  type?: MaintType;
  date: string; // Jalali
  cost?: number;
  vendor?: string | null;
  note?: string;
  method?: string;
  accountId?: string | null;
}

// ═══════════════════════════════════════════════════════════════════
//  فاز ۲ ماژول عملیات — سفارش خرید (Purchase Orders)
//  تطبیق سه‌ضلعی: purchase_orders <-> inv_vouchers (GRN) <-> transactions
// ═══════════════════════════════════════════════════════════════════

export type PoStatus = 'draft' | 'sent' | 'partial' | 'received' | 'cancelled';

export interface PurchaseOrderItem {
  id: string;
  orderId: string;
  inventoryItemId: string | null;
  description: string;
  qty: number;
  unitCost: number;
  totalCost: number;
}

export interface PurchaseOrder {
  id: string;
  no: string;
  branchId: string;
  supplierId: string | null;
  status: PoStatus;
  expectedDate: string | null; // Jalali
  note: string;
  estTotal: number;
  finalTotal: number | null;
  refTransactionId: string | null;
  refInvVoucherId: string | null;
  receivedBy: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  items: PurchaseOrderItem[];
}

export interface NewPurchaseOrderItemInput {
  inventoryItemId?: string | null;
  description: string;
  qty: number;
  unitCost?: number;
}

export interface NewPurchaseOrderInput {
  branchId: string;
  supplierId?: string | null;
  expectedDate?: string | null;
  note?: string;
  items: NewPurchaseOrderItemInput[];
}

export interface UpdatePurchaseOrderInput {
  supplierId?: string | null;
  expectedDate?: string | null;
  note?: string;
  status?: PoStatus;
  items?: NewPurchaseOrderItemInput[];
}

export interface ReceivePurchaseOrderLineInput {
  poItemId: string;
  receivedQty: number;
  receivedUnitPrice?: number;
}

export interface ReceivePurchaseOrderInput {
  lines: ReceivePurchaseOrderLineInput[];
  vatAmount?: number;
}

export interface ReceivePurchaseOrderResult {
  order: PurchaseOrder;
  voucherNo: string | null;
  transactionId: string;
  hasDiscrepancy: boolean;
}

// ═══════════════════════════════════════════════════════════════════
//  فاز ۵ — پیشنهاد سفارش خودکار (اقلام زیر حداقل موجودی)
// ═══════════════════════════════════════════════════════════════════

export interface PoSuggestionItem {
  id: string; // inventoryItemId
  name: string;
  unit: string;
  currentQty: number;
  minQty: number;
  suggestedQty: number;
  suggestedUnitCost: number;
}

// ═══════════════════════════════════════════════════════════════════
//  فاز ۶ — وظایف روزانه (Task Templates / Instances)
// ═══════════════════════════════════════════════════════════════════

export type TaskFrequency = 'daily' | 'weekly' | 'monthly';
export type TaskStatus = 'pending' | 'done' | 'skipped';

export interface TaskTemplate {
  id: string;
  branchId: string | null; // null = همه شعب
  title: string;
  category: string;
  assignedRole: UserRole;
  frequency: TaskFrequency;
  estimatedMinutes: number;
  checklistJson: string[] | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NewTaskTemplateInput {
  branchId?: string | null;
  title: string;
  category?: string;
  assignedRole?: UserRole;
  frequency?: TaskFrequency;
  estimatedMinutes?: number;
  checklistJson?: string[] | null;
}

export interface UpdateTaskTemplateInput {
  title?: string;
  category?: string;
  assignedRole?: UserRole;
  frequency?: TaskFrequency;
  estimatedMinutes?: number;
  checklistJson?: string[] | null;
  isActive?: boolean;
}

export interface TaskInstance {
  id: string;
  templateId: string | null;
  branchId: string;
  assignedUserId: string | null;
  assignedUserName: string | null;
  dueDate: string; // Jalali
  completedAt: string | null;
  status: TaskStatus;
  note: string | null;
  title: string;
  category: string;
  estimatedMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateTaskInstanceInput {
  status?: TaskStatus;
  note?: string | null;
  assignedUserId?: string | null;
}

export interface TaskFilters {
  branchId?: string;
  date?: string;
  assignedUserId?: string;
  mine?: boolean;
}
