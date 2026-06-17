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

// ─── سفارش بیرون‌بر — صفحه‌ی عمومی /order (بدون auth) ───────────────

export interface PublicOrderItem {
  id: string;
  titleFa: string;
  titleEn: string;
  descriptionFa: string;
  descriptionEn: string;
  price: number;
}

export interface PublicOrderSection {
  id: string;
  slug: string;
  labelFa: string;
  labelEn: string;
  items: PublicOrderItem[];
}

export interface PublicOrderSettings {
  isOpen: boolean;
  /** isOpen=true و الان داخل بازه‌ی [openTime, closeTime) به‌وقت تهران */
  isOpenNow: boolean;
  openTime: string;
  closeTime: string;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  payCash: boolean;
  payOnline: boolean;
  minOrder: number;
}

export interface PublicOrderMenu {
  branch: { id: string; name: string };
  settings: PublicOrderSettings;
  sections: PublicOrderSection[];
}
