const CART_STORAGE_KEY = 'basharaf-order-cart';

export type Cart = Record<string, number>;

/** خواندن سبد از localStorage — در صورت نبود/خرابی، سبد خالی. */
export function loadCart(): Cart {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const cart: Cart = {};
    for (const [id, qty] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof qty === 'number' && qty > 0) cart[id] = qty;
    }
    return cart;
  } catch {
    return {};
  }
}

export function saveCart(cart: Cart): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

/** بعد از ثبت موفق سفارش — سبد را پاک می‌کند. */
export function clearCart(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(CART_STORAGE_KEY);
}
