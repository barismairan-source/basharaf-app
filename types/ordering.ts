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
  payGateway: PaymentGatewayId;
  zarinpalMerchantId: string | null;
  idpayApiKey: string | null;
  zibalMerchantId: string | null;
  neshanApiKey: string | null;
  minOrder: number;
  prepBufferMin: number;
  createdAt: string;
  updatedAt: string;
}

export type PaymentGatewayId = 'zarinpal' | 'idpay' | 'zibal';

export interface OrdSettingsPatch {
  isOpen?: boolean;
  openTime?: string;
  closeTime?: string;
  deliveryEnabled?: boolean;
  pickupEnabled?: boolean;
  payCash?: boolean;
  payOnline?: boolean;
  payGateway?: PaymentGatewayId;
  zarinpalMerchantId?: string;
  idpayApiKey?: string;
  zibalMerchantId?: string;
  neshanApiKey?: string;
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
  neshanApiKey: string | null;
}

export interface PublicOrderZone {
  id: string;
  name: string;
  deliveryFee: number;
  minOrder: number;
}

export interface PublicOrderMenu {
  branch: { id: string; name: string };
  settings: PublicOrderSettings;
  sections: PublicOrderSection[];
  zones: PublicOrderZone[];
}

// ─── سفارش بیرون‌بر — ثبت سفارش از /order/checkout (نقدی، idempotent) ────

export interface CreateOrderItemInput {
  id: string;
  qty: number;
}

export interface CreateOrderInput {
  clientToken: string;
  serviceType: 'delivery' | 'pickup';
  payMethod: 'cash' | 'online';
  customerName: string;
  customerPhone: string;
  address?: string;
  zoneId?: string;
  pickupTime?: string;
  note?: string;
  items: CreateOrderItemInput[];
  /** اگر مشتری لاگین کرده باشد، سفارش به حسابش وصل می‌شود */
  orderCustomerId?: string;
}

export interface PublicOrderLine {
  itemName: string;
  unitPrice: number;
  qty: number;
  lineTotal: number;
}

export interface PublicOrder {
  id: string;
  orderNo: string;
  trackToken: string;
  status: string;
  serviceType: string;
  customerName: string;
  customerPhone: string;
  address: string | null;
  zoneName: string | null;
  pickupTime: string | null;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  payMethod: string;
  payStatus: string;
  payRef: string | null;
  jalaliDate: string;
  note: string | null;
  createdAt: string;
  lines: PublicOrderLine[];
}

// ─── سفارش بیرون‌بر — پنل عملیاتی پرسنل /orders (state machine + Realtime) ──

export type OrderStatus =
  | 'received'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'rejected';

export interface BoardOrderLine {
  itemName: string;
  unitPrice: number;
  qty: number;
  lineTotal: number;
}

export interface BoardOrder {
  id: string;
  branchId: string;
  branchName: string;
  orderNo: string;
  status: OrderStatus;
  serviceType: 'delivery' | 'pickup';
  customerName: string;
  customerPhone: string;
  address: string | null;
  zoneName: string | null;
  pickupTime: string | null;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  payMethod: string;
  payStatus: string;
  jalaliDate: string;
  note: string | null;
  createdAt: string;
  lines: BoardOrderLine[];
}

export interface OrderStatusPatchInput {
  status: OrderStatus;
}
