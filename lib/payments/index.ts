import { ApiError } from '@/lib/api-error';
import { getOrdSettings } from '@/lib/ordering/settings';
import type { PaymentGateway } from './types';
import { createZarinpalGateway } from './zarinpal';
import { createIdpayGateway } from './idpay';
import { createZibalGateway } from './zibal';

export type { PaymentGateway, PaymentRequestResult, PaymentVerifyResult } from './types';

/**
 * درگاه پرداخت فعال شعبه — بر اساس ord_settings.pay_gateway و کلید/مرچنت
 * همان درگاه که از پنل «تنظیمات سفارش» وارد شده (نه env). برای افزودن
 * درگاه دیگر: یک فایل پیاده‌سازی جدید (مثل zarinpal.ts) + یک شاخه‌ی جدید
 * در سوییچ زیر + ستون کلید جدید در ord_settings.
 */
export async function getPaymentGateway(branchId: string): Promise<PaymentGateway> {
  const settings = await getOrdSettings(branchId);

  switch (settings.payGateway) {
    case 'idpay':
      if (!settings.idpayApiKey) {
        throw new ApiError(500, 'درگاه آی‌دی‌پی پیکربندی نشده — کلید API را در تنظیمات سفارش وارد کنید', 'GATEWAY_NOT_CONFIGURED');
      }
      return createIdpayGateway(settings.idpayApiKey);

    case 'zibal':
      if (!settings.zibalMerchantId) {
        throw new ApiError(500, 'درگاه زیبال پیکربندی نشده — Merchant ID را در تنظیمات سفارش وارد کنید', 'GATEWAY_NOT_CONFIGURED');
      }
      return createZibalGateway(settings.zibalMerchantId);

    case 'zarinpal':
    default:
      if (!settings.zarinpalMerchantId) {
        throw new ApiError(500, 'درگاه زرین‌پال پیکربندی نشده — Merchant ID را در تنظیمات سفارش وارد کنید', 'GATEWAY_NOT_CONFIGURED');
      }
      return createZarinpalGateway(settings.zarinpalMerchantId);
  }
}
