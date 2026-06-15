import type { PaymentGateway } from './types';
import { zarinpalGateway } from './zarinpal';

export type { PaymentGateway, PaymentRequestResult, PaymentVerifyResult } from './types';

/**
 * درگاه پرداخت فعال. فعلاً فقط Zarinpal — برای افزودن IDPay/Zibal،
 * یک فایل پیاده‌سازی جدید (مثل zarinpal.ts) بساز و اینجا انتخابش کن.
 */
export function getPaymentGateway(): PaymentGateway {
  return zarinpalGateway;
}
