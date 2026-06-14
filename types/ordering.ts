// ─── سفارش بیرون‌بر — تنظیمات شعبه + محدوده‌های ارسال ───────────────

export interface OrdSettings {
  id: string;
  branchId: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  payCash: boolean;
  payOnline: boolean;
  minOrder: number;
  prepBufferMin: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrdSettingsPatch {
  isOpen?: boolean;
  openTime?: string;
  closeTime?: string;
  deliveryEnabled?: boolean;
  pickupEnabled?: boolean;
  payCash?: boolean;
  payOnline?: boolean;
  minOrder?: number;
  prepBufferMin?: number;
}

export interface OrdZone {
  id: string;
  branchId: string;
  name: string;
  deliveryFee: number;
  minOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NewOrdZoneInput {
  branchId: string;
  name: string;
  deliveryFee: number;
  minOrder?: number;
  isActive?: boolean;
}

export interface OrdZonePatch {
  name?: string;
  deliveryFee?: number;
  minOrder?: number;
  isActive?: boolean;
}
