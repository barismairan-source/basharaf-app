import type { StateCreator } from 'zustand';
import type { Coupon, CouponValidationResult } from '@/types';

/**
 * CouponsSlice — مدیریت کوپن‌ها (CRUD optimistic، فقط SuperAdmin) + اعتبارسنجی کد.
 * validateCoupon هم برای پیش‌نمایش (commit=false) و هم مصرف (commit=true) به کار می‌رود.
 */
export interface CouponsSlice {
  coupons: Coupon[];
  couponsLoaded: boolean;
  couponsError: string | null;
  loadCoupons: () => Promise<void>;
  createCoupon: (params: {
    code: string;
    discountType: 'percent' | 'fixed';
    value: number;
    minOrder?: number;
    maxDiscount?: number | null;
    validFrom: string;
    validTo: string;
    usageLimit?: number | null;
    branchId?: string | null;
  }) => Promise<Coupon | null>;
  updateCoupon: (
    id: string,
    patch: Partial<
      Pick<
        Coupon,
        | 'code'
        | 'discountType'
        | 'value'
        | 'minOrder'
        | 'maxDiscount'
        | 'validFrom'
        | 'validTo'
        | 'usageLimit'
        | 'branchId'
        | 'isActive'
      >
    >,
  ) => Promise<boolean>;
  deleteCoupon: (id: string) => Promise<boolean>;
  validateCoupon: (params: {
    code: string;
    amount: number;
    customerId?: string | null;
    branchId?: string | null;
    refTransactionId?: string | null;
    commit?: boolean;
  }) => Promise<CouponValidationResult | null>;
}

export const createCouponsSlice: StateCreator<CouponsSlice> = (set, get) => ({
  coupons: [],
  couponsLoaded: false,
  couponsError: null,

  async loadCoupons() {
    try {
      const res = await fetch('/api/coupons', { credentials: 'include' });
      if (!res.ok) return;
      const { coupons } = (await res.json()) as { coupons: Coupon[] };
      set({ coupons, couponsLoaded: true });
    } catch {
      set({ couponsLoaded: true });
    }
  },

  async createCoupon(params) {
    const tempId = `optimistic-${Date.now()}`;
    const optimistic: Coupon = {
      id: tempId,
      code: params.code,
      discountType: params.discountType,
      value: params.value,
      minOrder: params.minOrder ?? 0,
      maxDiscount: params.maxDiscount ?? null,
      validFrom: params.validFrom,
      validTo: params.validTo,
      usageLimit: params.usageLimit ?? null,
      usedCount: 0,
      branchId: params.branchId ?? null,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ coupons: [optimistic, ...s.coupons], couponsError: null }));
    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(params),
      });
      const data = (await res.json()) as { coupon?: Coupon; error?: string };
      if (!res.ok || !data.coupon) throw new Error(data.error ?? 'خطا');
      set((s) => ({ coupons: s.coupons.map((c) => (c.id === tempId ? data.coupon! : c)) }));
      return data.coupon;
    } catch (e) {
      set((s) => ({
        coupons: s.coupons.filter((c) => c.id !== tempId),
        couponsError: e instanceof Error ? e.message : 'خطا',
      }));
      return null;
    }
  },

  async updateCoupon(id, patch) {
    const snapshot = get().coupons.find((c) => c.id === id);
    if (!snapshot) return false;
    set((s) => ({ coupons: s.coupons.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
    try {
      const res = await fetch(`/api/coupons/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error('خطا');
      return true;
    } catch {
      set((s) => ({ coupons: s.coupons.map((c) => (c.id === id ? snapshot : c)) }));
      return false;
    }
  },

  async deleteCoupon(id) {
    const snapshot = get().coupons.find((c) => c.id === id);
    if (!snapshot) return false;
    set((s) => ({ coupons: s.coupons.filter((c) => c.id !== id) }));
    try {
      const res = await fetch(`/api/coupons/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('خطا');
      return true;
    } catch {
      set((s) => ({ coupons: [snapshot, ...s.coupons] }));
      return false;
    }
  },

  async validateCoupon(params) {
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(params),
      });
      const data = (await res.json()) as CouponValidationResult & { error?: string };
      if (!res.ok && data.valid == null) throw new Error(data.error ?? 'خطا');
      // اگر commit موفق بود، used_count محلی را به‌روز کن
      if (data.valid && data.committed && data.couponId) {
        set((s) => ({
          coupons: s.coupons.map((c) =>
            c.id === data.couponId ? { ...c, usedCount: c.usedCount + 1 } : c,
          ),
        }));
      }
      return data;
    } catch {
      return null;
    }
  },
});
