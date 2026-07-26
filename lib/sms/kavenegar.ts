import { redactError } from '@/lib/notifications/redaction';
import { SMS_REQUEST_TIMEOUT_MS, type SmsSendOutcome } from './types';

/**
 * ارسال پیامک از طریق Kavenegar.
 * اگر KAVENEGAR_API_KEY در env نباشد یا SMS_DRY_RUN=true باشد،
 * حالت dry_run فعال می‌شود: لاگ ثبت می‌شود ولی API واقعی صدا نمی‌خورد.
 * این رفتار عمداً حفظ شده — نبود کلید یک خطای پیکربندی fail-closed نیست،
 * بلکه معادل dry-run ضمنی است (رفتار تاریخی این provider، پیش از افزوده‌شدن ملی‌پیامک).
 */
export async function kavenegarSend(
  phone: string,
  message: string
): Promise<SmsSendOutcome> {
  const apiKey = process.env.KAVENEGAR_API_KEY;
  const isDryRun = !apiKey || process.env.SMS_DRY_RUN === 'true';

  if (isDryRun) {
    return { status: 'dry_run' };
  }

  try {
    const body = new URLSearchParams({ receptor: phone, message });
    const res = await fetch(
      `https://api.kavenegar.com/v1/${apiKey}/sms/send.json`,
      { method: 'POST', body, signal: AbortSignal.timeout(SMS_REQUEST_TIMEOUT_MS) }
    );
    const json: unknown = await res.json();
    const kavRes = json as { return?: { status?: number } };
    if (res.ok && kavRes?.return?.status === 200) {
      return { status: 'sent', providerResponse: json };
    }
    return { status: 'failed', providerResponse: json, error: `کاوه‌نگار: HTTP ${res.status}` };
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'TimeoutError';
    return { status: 'failed', error: isTimeout ? 'کاوه‌نگار: timeout' : redactError(err) };
  }
}
