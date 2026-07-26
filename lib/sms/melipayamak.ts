import { redactError } from '@/lib/notifications/redaction';
import { SMS_REQUEST_TIMEOUT_MS, type SmsSendOutcome } from './types';

const MELIPAYAMAK_BASE_URL = 'https://console.melipayamak.com/api/send/simple';

interface MelipayamakResponseBody {
  recId?: number;
  /** خالی/غایب یعنی موفقیت؛ فقط هنگام خطا پر می‌شود (طبق مستندات پنل: «شرح خطا در صورت بروز»). */
  status?: string;
}

/**
 * ارسال پیامک از طریق ملی‌پیامک — API «ارسال پیامک ساده»ی کنسول جدید
 * (console.melipayamak.com)، نه REST قدیمی کاربری/رمز عبور.
 *
 * توکن هر اکانت مستقیم در مسیر URL قرار می‌گیرد (نه در بدنه) — مثل
 * Kavenegar، این یعنی توکن باید در redaction هم پوشش داده شود (اضافه شد
 * به lib/notifications/redaction.ts).
 *
 * قرارداد پاسخ (طبق پنل): recId شناسه‌ی پیام است؛ status فقط هنگام خطا
 * پر می‌شود (توضیح خطا) — یعنی موفقیت = status خالی/غایب و recId معتبر.
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

  const token = process.env.MELIPAYAMAK_TOKEN;
  const from = process.env.MELIPAYAMAK_FROM;

  if (!token || !from) {
    return {
      status: 'failed',
      error: 'پیکربندی ملی‌پیامک ناقص است — MELIPAYAMAK_TOKEN/MELIPAYAMAK_FROM را در env تنظیم کنید',
    };
  }

  try {
    const res = await fetch(`${MELIPAYAMAK_BASE_URL}/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: phone, text: message }),
      signal: AbortSignal.timeout(SMS_REQUEST_TIMEOUT_MS),
    });
    const json: unknown = await res.json().catch(() => null);
    const parsed = json as MelipayamakResponseBody | null;

    if (res.ok && !parsed?.status && typeof parsed?.recId === 'number' && parsed.recId > 0) {
      return { status: 'sent', providerResponse: parsed, providerMessageId: String(parsed.recId) };
    }

    return {
      status: 'failed',
      providerResponse: parsed ?? undefined,
      error: `ملی‌پیامک: ${parsed?.status || `HTTP ${res.status}`}`,
    };
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'TimeoutError';
    return { status: 'failed', error: isTimeout ? 'ملی‌پیامک: timeout' : redactError(err) };
  }
}
