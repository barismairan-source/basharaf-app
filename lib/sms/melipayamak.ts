import { redactError } from '@/lib/notifications/redaction';
import { SMS_REQUEST_TIMEOUT_MS, type SmsSendOutcome } from './types';

const MELIPAYAMAK_URL = 'https://rest.payamak-panel.com/api/SendSMS/SendSMS';

interface MelipayamakResponseBody {
  Value?: string;
  RetStatus?: number;
  StrRetStatus?: string;
}

/**
 * ارسال پیامک از طریق ملی‌پیامک (rest.payamak-panel.com).
 *
 * قرارداد پاسخ رسمی: RetStatus=1 یعنی موفقیت؛ Value شناسه‌ی پیام (BulkID) است.
 * هر RetStatus دیگری خطا محسوب می‌شود — StrRetStatus توضیح خطا را دارد.
 *
 * برخلاف Kavenegar، پیکربندی ناقص اینجا silent dry-run نمی‌شود — چون این
 * provider تازه است و هیچ رفتار تاریخی‌ای برای حفظ‌کردن ندارد؛ طبق قرارداد
 * صریح این افزونه، پیکربندی ناقص باید fail-closed شود، نه به‌صورت ضمنی به
 * dry-run سقوط کند (که می‌تونه غیرارسال واقعی رو بی‌سروصدا مخفی کنه).
 */
export async function melipayamakSend(
  phone: string,
  message: string
): Promise<SmsSendOutcome> {
  const isDryRun = process.env.SMS_DRY_RUN === 'true';
  if (isDryRun) {
    return { status: 'dry_run' };
  }

  const username = process.env.MELIPAYAMAK_USERNAME;
  const password = process.env.MELIPAYAMAK_PASSWORD;
  const from = process.env.MELIPAYAMAK_FROM;

  if (!username || !password || !from) {
    return {
      status: 'failed',
      error: 'پیکربندی ملی‌پیامک ناقص است — MELIPAYAMAK_USERNAME/MELIPAYAMAK_PASSWORD/MELIPAYAMAK_FROM را در env تنظیم کنید',
    };
  }

  try {
    const body = new URLSearchParams({
      username,
      password,
      to: phone,
      from,
      text: message,
      isFlash: 'false',
    });
    const res = await fetch(MELIPAYAMAK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(SMS_REQUEST_TIMEOUT_MS),
    });
    const json: unknown = await res.json().catch(() => null);
    const parsed = json as MelipayamakResponseBody | null;

    if (res.ok && parsed?.RetStatus === 1) {
      return { status: 'sent', providerResponse: parsed, providerMessageId: parsed.Value };
    }

    return {
      status: 'failed',
      providerResponse: parsed ?? undefined,
      error: `ملی‌پیامک: ${parsed?.StrRetStatus ?? `HTTP ${res.status}`}`,
    };
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'TimeoutError';
    return { status: 'failed', error: isTimeout ? 'ملی‌پیامک: timeout' : redactError(err) };
  }
}
