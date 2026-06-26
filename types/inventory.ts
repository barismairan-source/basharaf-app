// ═══════════════════════════════════════════════════════════════════
//  این تایپ‌ها را به فایل types اصلی پروژه (@/types) اضافه کنید.
//  هم‌سبک Transaction / User موجود.
// ═══════════════════════════════════════════════════════════════════

export type InvUnit = 'kg' | 'g' | 'L' | 'ml' | 'pcs' | 'can' | 'pack';
export type InvItemKind = 'raw' | 'prep';
export type InvVoucherKind = 'in' | 'out' | 'waste' | 'sale' | 'produce' | 'stocktake';
export type InvVoucherStatus = 'pending' | 'approved' | 'rejected';
export type InvCookMode = 'daily' | 'batch';

export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  category: string;
  kind: InvItemKind;
  branchId: string | null;
  unit: InvUnit;
  basePerUnit: number;
  yieldPct: number;
  qtyPhysical: number;
  qtyBase: number;
  avgCostPerBase: number;
  minBase: number;
  batchYieldBase: number | null;
  shelfLifeDays: number;
  prepRecipe: Array<{ itemId: string; qtyBase: number }> | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NewInventoryItemInput {
  code: string;
  name: string;
  category?: string;
  kind?: InvItemKind;
  branchId: string;
  unit?: InvUnit;
  basePerUnit?: number;
  yieldPct?: number;
  minBase?: number;
  batchYieldBase?: number | null;
  shelfLifeDays?: number;
  prepRecipe?: Array<{ itemId: string; qtyBase: number }> | null;
}

export interface InventoryRecipeLine {
  id?: string;
  itemId: string;
  qtyBase: number;
  overridePct?: number | null;
}

export interface InventoryRecipe {
  id: string | null;
  name: string;
  branchId: string | null;
  portions: number;
  targetFcPct: number;
  price: number;
  cookMode: InvCookMode;
  shelfLifeDays: number;
  menuItemId?: string | null;
  isActive?: boolean;
  lines: InventoryRecipeLine[];
}

export interface InventoryVoucherLine {
  id: string;
  itemId: string;
  qtyBase: number;
  estUnitCost: number;
  finalUnitCost: number | null;
}

export interface InventoryVoucher {
  id: string;
  no: string;
  kind: InvVoucherKind;
  status: InvVoucherStatus;
  branchId: string | null;
  estTotal: number;
  finalTotal: number | null;
  note: string;
  saleMeta: unknown | null;
  createdBy: string | null;
  makerDate: string;
  createdAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  linkedTransactionId: string | null;
  parentVoucherId: string | null;
  lines: InventoryVoucherLine[];
  updatedAt: string;
}

export interface NewVoucherInput {
  kind: InvVoucherKind;
  branchId: string;
  note?: string;
  date: string; // Jalali
  lines: Array<{ itemId: string; qtyBase: number; estUnitCost?: number }>;
  saleMeta?: unknown | null;
}

export interface ProduceInput {
  itemId: string;
  batches: number;
  date: string;
}

// خروجی پیش‌بینی (مطابق inventoryLogic.forecast)
export interface ForecastResult {
  targetWd: number;
  targetWdName: string;
  wdDayCount: number;
  allDayCount: number;
  mode: 'simple' | 'weekday';
  horizon: number;
  event: { factor: number; type: string; label: string; source: string };
  plan: Array<{
    recipeId: string; name: string; avgPerDay: number; simpleAvg: number;
    basis: 'weekday' | 'fallback' | 'simple'; baseSuggested: number;
    factor: number; reserved: number; suggested: number;
  }>;
  needBase: Record<string, number>;
  rawCoverage: Array<{
    itemId: string; name: string; unit: string; basePerUnit: number;
    qtyBase: number; dailyUse: number; coverDays: number; needSpan: number; shortfall: number;
  }>;
  prepCoverage: Array<{
    itemId: string; name: string; unit: string; basePerUnit: number; qtyBase: number;
    dailyUse: number; coverDays: number; shelf: number; isDaily: boolean; produceFor: number;
  }>;
  prepAlerts: Array<{
    itemId: string; name: string; qtyBase: number; dailyUse: number; coverDays: number;
    shelf: number; isDaily: boolean; produceFor: number; batches: number; producedBase: number;
    rawNeed: Array<{ itemId: string; name: string; qtyBase: number; unit: string; basePerUnit: number; have: number }>;
    unit: string; basePerUnit: number;
  }>;
}

export interface RecipeLineCost {
  itemId: string;
  name: string;
  qtyBase: number;
  unit: string;
  yieldUsed: number;
  lineCost: number;
  missingCost: boolean;
  subLines?: RecipeLineCost[]; // فقط برای آیتم‌های نیمه‌آماده — مواد تشکیل‌دهنده
}

export interface RecipeCosting {
  lines: RecipeLineCost[];
  totalCost: number;
  portions: number;
  costPerPortion: number;
  price: number;
  foodCostPct: number | null;
  targetFcPct: number;
  suggestedPrice: number;
  hasMissingCosts: boolean;
}

export interface ExpiryWarning {
  itemId: string;
  itemName: string;
  unit: string;
  expiryDate: string;
  daysUntilExpiry: number;
  isExpired: boolean;
}
