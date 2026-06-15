import { ApiError } from '@/lib/api-error';
import type { PaymentGateway, PaymentRequestResult, PaymentVerifyResult } from './types';

// ─── درگاه Zarinpal (API v4) ────────────────────────────────────────────
// مبلغ به‌صورت تومان (currency: 'IRT') ارسال می‌شود — تبدیل ریال/تومان به
// عهده‌ی Zarinpal است، نه ضرب دستی در ۱۰ (ریسک خطای واحد را حذف می‌کند).
// ZARINPAL_MERCHANT_ID فقط سرور — هرگز به کلاینت نشت نمی‌کند.

const REQUEST_URL = 'https://payment.zarinpal.com/pg/v4/payment/request.json';
const VERIFY_URL = 'https://payment.zarinpal.com/pg/v4/payment/verify.json';
const START_PAY_URL = 'https://payment.zarinpal.com/pg/StartPay/';

interface ZarinpalRequestResponse {
  data?: { code?: number; authority?: string; message?: string };
  errors?: unknown;
}

interface ZarinpalVerifyResponse {
  data?: { code?: number; ref_id?: number | string; message?: string };
  errors?: unknown;
}

function getMerchantId(): string {
  const id = process.env.ZARINPAL_MERCHANT_ID;
  if (!id) {
    throw new ApiError(500, 'درگاه پرداخت آنلاین پیکربندی نشده است', 'GATEWAY_NOT_CONFIGURED');
  }
  return id;
}

export const zarinpalGateway: PaymentGateway = {
  async request(amount, orderId, callbackUrl): Promise<PaymentRequestResult> {
    const res = await fetch(REQUEST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant_id: getMerchantId(),
        amount,
        currency: 'IRT',
        callback_url: callbackUrl,
        description: `پرداخت سفارش ${orderId}`,
      }),
    });
    const json = (await res.json()) as ZarinpalRequestResponse;
    const data = json.data;
    if (!data || data.code !== 100 || !data.authority) {
      throw new ApiError(502, data?.message || 'خطا در اتصال به درگاه پرداخت', 'GATEWAY_REQUEST_FAILED');
    }
    return { url: `${START_PAY_URL}${data.authority}`, authority: data.authority };
  },

  async verify(authority, amount): Promise<PaymentVerifyResult> {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant_id: getMerchantId(),
        amount,
        currency: 'IRT',
        authority,
      }),
    });
    const json = (await res.json()) as ZarinpalVerifyResponse;
    const data = json.data;
    // 100 = موفق، 101 = قبلاً تایید شده (idempotent از سمت Zarinpal)
    if (data && (data.code === 100 || data.code === 101)) {
      return { ok: true, refId: data.ref_id != null ? String(data.ref_id) : undefined };
    }
    return { ok: false, message: data?.message || 'تایید پرداخت ناموفق بود' };
  },
};
