/**
 * انواع ماژول مشتریان — مطابق سبک types/ موجود.
 * پول‌ها number (تومان صحیح، سرور با Number() سریالایز می‌کند).
 * تاریخ کاربری رشته‌ی شمسی؛ createdAt/updatedAt رشته‌ی ISO سیستمی.
 */

/** سطح وفاداری — متنی (مثل accounts.type/contacts.type) نه enum. */
export type CustomerTier = 'bronze' | 'silver' | 'gold' | 'platinum' | string;

export interface Customer {
  id: string;
  name: string;
  phone: string;
  birthday: string | null;        // Jalali string
  homeBranchId: string | null;    // scope شعبه
  contactId: string | null;       // اتصال به حساب نسیه (contacts)
  tier: CustomerTier;
  points: number;
  visitCount: number;
  totalSpent: number;
  note: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoyaltyEntry {
  id: string;
  customerId: string;
  branchId: string;
  type: 'earn' | 'redeem' | 'adjust' | string;
  points: number;                 // +earn / -redeem / ±adjust
  reason: string;
  refTransactionId: string | null;
  createdBy: string;
  createdAt: string;
}

export interface Reservation {
  id: string;
  customerId: string | null;
  branchId: string;
  tableId: string | null;
  date: string;                   // Jalali string
  time: string;
  partySize: number;
  status: 'pending' | 'confirmed' | 'seated' | 'cancelled' | 'no_show' | string;
  note: string | null;
  createdBy: string;
  createdAt: string;
}

export interface Feedback {
  id: string;
  customerId: string | null;
  branchId: string;
  rating: number;                 // 1..5
  comment: string | null;
  source: string;
  refTransactionId: string | null;
  createdAt: string;
}

/** خروجی GET /api/customers/[id] — پروفایل + تاریخچه. */
export interface CustomerDetail extends Customer {
  loyalty: LoyaltyEntry[];
  reservations: Reservation[];
  feedback: Feedback[];
}

/* ─── کوپن/تخفیف (فاز ۳) ─── */

export type CouponDiscountType = 'percent' | 'fixed' | string;

export interface Coupon {
  id: string;
  code: string;
  discountType: CouponDiscountType;
  value: number;
  minOrder: number;
  maxDiscount: number | null;
  validFrom: string;            // Jalali string
  validTo: string;              // Jalali string
  usageLimit: number | null;
  usedCount: number;
  branchId: string | null;      // null = همه شعب
  isActive: boolean;
  createdAt: string;
}

export interface CouponRedemption {
  id: string;
  couponId: string;
  customerId: string | null;
  branchId: string;
  discountAmount: number;
  refTransactionId: string | null;
  createdBy: string;
  createdAt: string;
}

/** خروجی POST /api/coupons/validate */
export interface CouponValidationResult {
  valid: boolean;
  reason?: string;
  committed?: boolean;
  couponId?: string;
  code?: string;
  discountType?: CouponDiscountType;
  discountAmount?: number;
  redemptionId?: string;
}

/* ─── رزرو میز (فاز ۴) ─── */

export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'seated'
  | 'cancelled'
  | 'no_show'
  | string;

export interface RestaurantTable {
  id: string;
  branchId: string;
  name: string;
  capacity: number;
  area: string | null;
  isActive: boolean;
  createdAt: string;
}

/* ─── بازخورد/گزارش (فاز ۵) ─── */

/** میانگین امتیاز رضایت هر شعبه (خروجی GET /api/feedback/summary) */
export interface FeedbackSummaryRow {
  branchId: string;
  average: number;
  count: number;
}
