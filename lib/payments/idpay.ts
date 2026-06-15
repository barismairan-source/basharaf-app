import { ApiError } from '@/lib/api-error';
import type { PaymentGateway, PaymentRequestResult, PaymentVerifyResult } from './types';

// ─── درگاه IDPay (API v1.1) ─────────────────────────────────────────────
// ⚠️ IDPay مبلغ را به ریال می‌خواهد — مبلغ تومانی سفارش × ۱۰ (تبدیل صریح).
// apiKey از تنظیمات سفارش (پنل) می‌آید — هرگز به کلاینت نشت نمی‌کند.

const REQUEST_URL = 'https://api.idpay.ir/v1.1/payment';
const VERIFY_URL = 'https://api.idpay.ir/v1.1/payment/verify';

interface IdpayRequestResponse {
  id?: string;
  link?: string;
  error_message?: string;
}

interface IdpayVerifyResponse {
  status?: number | string;
  track_id?: number | string;
  error_message?: string;
}

export function createIdpayGateway(apiKey: string): PaymentGateway {
  const headers = {
    'Content-Type': 'application/json',
    'X-API-KEY': apiKey,
  };

  return {
    async request(amount, orderId, callbackUrl): Promise<PaymentRequestResult> {
      const res = await fetch(REQUEST_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          order_id: orderId,
          amount: amount * 10, // تومان → ریال
          callback: callbackUrl,
          desc: `پرداخت سفارش ${orderId}`,
        }),
      });
      const json = (await res.json()) as IdpayRequestResponse;
      if (!json.id || !json.link) {
        throw new ApiError(502, json.error_message || 'خطا در اتصال به درگاه پرداخت', 'GATEWAY_REQUEST_FAILED');
      }
      return { url: json.link, authority: json.id };
    },

    async verify(authority, _amount, orderId): Promise<PaymentVerifyResult> {
      const res = await fetch(VERIFY_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ id: authority, order_id: orderId }),
      });
      const json = (await res.json()) as IdpayVerifyResponse;
      const status = Number(json.status);
      // 100 = پرداخت تایید شد، 101 = قبلاً تایید شده (idempotent)
      if (status === 100 || status === 101) {
        return { ok: true, refId: json.track_id != null ? String(json.track_id) : undefined };
      }
      return { ok: false, message: json.error_message || 'تایید پرداخت ناموفق بود' };
    },
  };
}
