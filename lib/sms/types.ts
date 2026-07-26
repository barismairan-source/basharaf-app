export type SmsStatus = 'pending' | 'sent' | 'failed' | 'dry_run' | 'deduped' | 'capped';

export type SmsProviderName = 'kavenegar' | 'melipayamak';

export const SMS_PROVIDER_NAMES: SmsProviderName[] = ['kavenegar', 'melipayamak'];

/** Timeout for outbound SMS provider HTTP requests. */
export const SMS_REQUEST_TIMEOUT_MS = 10_000;

export interface SendSmsParams {
  phone: string;
  message: string;
  /** کلید قالب برای dedup — مثلاً 'low_stock' */
  templateKey?: string;
  /** شناسه موجودیت مرتبط برای dedup — مثلاً itemId */
  entityId?: string;
}

export interface SendSmsResult {
  status: SmsStatus;
  logId: string;
}

/**
 * خروجی یک تلاش ارسال از یک provider adapter — داخلی لایه‌ی SMS،
 * قبل از نگاشت به SmsStatus/sms_log.
 */
export type SmsSendOutcome =
  | { status: 'sent'; providerResponse?: unknown; providerMessageId?: string }
  | { status: 'dry_run' }
  | { status: 'failed'; error: string; providerResponse?: unknown };

/** قرارداد مشترک هر SMS provider adapter. */
export interface SmsProviderAdapter {
  send(phone: string, message: string): Promise<SmsSendOutcome>;
}
