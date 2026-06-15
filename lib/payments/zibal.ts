import { ApiError } from '@/lib/api-error';
import type { PaymentGateway, PaymentRequestResult, PaymentVerifyResult } from './types';

// ─── درگاه Zibal (API v1) ───────────────────────────────────────────────
// ⚠️ Zibal مبلغ را به ریال می‌خواهد — مبلغ تومانی سفارش × ۱۰ (تبدیل صریح).
// merchant از تنظیمات سفارش (پنل) می‌آید — هرگز به کلاینت نشت نمی‌کند.

const REQUEST_URL = 'https://gateway.zibal.ir/v1/request';
const VERIFY_URL = 'https://gateway.zibal.ir/v1/verify';
const START_PAY_URL = 'https://gateway.zibal.ir/start/';

interface ZibalRequestResponse {
  result?: number;
  trackId?: number | string;
  message?: string;
}

interface ZibalVerifyResponse {
  result?: number;
  refNumber?: number | string;
  message?: string;
}

export function createZibalGateway(merchant: string): PaymentGateway {
  return {
    async request(amount, orderId, callbackUrl): Promise<PaymentRequestResult> {
      const res = await fetch(REQUEST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant,
          amount: amount * 10, // تومان → ریال
          callbackUrl,
          orderId,
          description: `پرداخت سفارش ${orderId}`,
        }),
      });
      const json = (await res.json()) as ZibalRequestResponse;
      if (json.result !== 100 || !json.trackId) {
        throw new ApiError(502, json.message || 'خطا در اتصال به درگاه پرداخت', 'GATEWAY_REQUEST_FAILED');
      }
      return { url: `${START_PAY_URL}${json.trackId}`, authority: String(json.trackId) };
    },

    async verify(authority, _amount, _orderId): Promise<PaymentVerifyResult> {
      const res = await fetch(VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchant, trackId: authority }),
      });
      const json = (await res.json()) as ZibalVerifyResponse;
      // 100 = با موفقیت تایید شد، 201 = قبلاً تایید شده (idempotent)
      if (json.result === 100 || json.result === 201) {
        return { ok: true, refId: json.refNumber != null ? String(json.refNumber) : undefined };
      }
      return { ok: false, message: json.message || 'تایید پرداخت ناموفق بود' };
    },
  };
}
