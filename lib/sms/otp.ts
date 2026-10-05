import { db, schema } from '@/lib/db/client';
import { redactError } from '@/lib/notifications/redaction';
import { dispatchSms, resolveSmsProvider } from './dispatcher';
import { normalizeIranPhone } from './phone';
import { SMS_REQUEST_TIMEOUT_MS, type SmsSendOutcome } from './types';

/**
 * ارسال کد ورود (OTP) مشتری آنلاین.
 *
 * چرا جدا از sendSms:
 * - خط اشتراکی ملی‌پیامک متن آزاد را رد می‌کند؛ فقط «الگو»ی تأییدشده در پنل
 *   مجاز است. اگر MELIPAYAMAK_OTP_BODY_ID تنظیم شده باشد، کد از مسیر الگو
 *   (`/api/send/shared`) با یک متغیر ارسال می‌شود.
 * - خودِ کد در sms_log ذخیره نمی‌شود (هر کسی که لاگ پیامک را می‌بیند نباید
 *   بتواند با کد دیگران وارد شود).
 *
 * تنظیم لازم برای ملی‌پیامک (پنل → «ارسال با الگو/خط خدماتی اشتراکی»):
 *   متنی مثل «کد ورود شما به با شرف: {0}» را ثبت و تأیید کنید، شماره‌ی الگو را
 *   در MELIPAYAMAK_OTP_BODY_ID بگذارید. برای Kavenegar یا خط اختصاصی متن ساده کافی است.
 */

const MELIPAYAMAK_SHARED_URL = 'https://console.melipayamak.com/api/send/shared';
const LOG_MESSAGE = 'کد ورود مشتری (OTP) — متن کد ذخیره نمی‌شود';

export type OtpSendResult = { ok: true } | { ok: false; error: string };

export function otpMessage(code: string): string {
  return `کد ورود شما به با شرف: ${code}\nاین کد را به کسی ندهید.`;
}

async function melipayamakPatternSend(phone: string, code: string, bodyId: number): Promise<SmsSendOutcome> {
  const token = process.env.MELIPAYAMAK_TOKEN;
  if (!token) {
    return { status: 'failed', error: 'پیکربندی ملی‌پیامک ناقص است — MELIPAYAMAK_TOKEN' };
  }
  try {
    const res = await fetch(`${MELIPAYAMAK_SHARED_URL}/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bodyId, to: phone, args: [code] }),
      signal: AbortSignal.timeout(SMS_REQUEST_TIMEOUT_MS),
    });
    const json = (await res.json().catch(() => null)) as { recId?: number; status?: string } | null;
    if (res.ok && !json?.status && typeof json?.recId === 'number' && json.recId > 0) {
      return { status: 'sent', providerResponse: json, providerMessageId: String(json.recId) };
    }
    return { status: 'failed', providerResponse: json ?? undefined, error: `ملی‌پیامک (الگو): ${json?.status || `HTTP ${res.status}`}` };
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'TimeoutError';
    return { status: 'failed', error: isTimeout ? 'ملی‌پیامک: timeout' : redactError(err) };
  }
}

export async function sendOtpSms(rawPhone: string, code: string): Promise<OtpSendResult> {
  const phone = normalizeIranPhone(rawPhone);
  if (!phone) return { ok: false, error: 'شماره موبایل نامعتبر است' };

  let provider: string | null;
  let outcome: SmsSendOutcome;
  const resolved = resolveSmsProvider();
  const bodyId = Number(process.env.MELIPAYAMAK_OTP_BODY_ID);

  if (process.env.SMS_DRY_RUN === 'true') {
    provider = resolved.name;
    outcome = { status: 'dry_run' };
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[OTP DRY-RUN] ${phone} — کد: ${code}`);
    }
  } else if (resolved.name === 'melipayamak' && Number.isFinite(bodyId) && bodyId > 0) {
    provider = 'melipayamak';
    outcome = await melipayamakPatternSend(phone, code, bodyId);
  } else {
    const dispatched = await dispatchSms(phone, otpMessage(code));
    provider = dispatched.provider;
    outcome = dispatched.outcome;
  }

  await db.insert(schema.smsLog).values({
    phone,
    message: LOG_MESSAGE,
    templateKey: 'customer_otp',
    status: outcome.status,
    provider: provider ?? 'unknown',
    error: outcome.status === 'failed' ? outcome.error : null,
    sentAt: outcome.status === 'sent' ? new Date() : null,
  }).catch(() => {});

  if (outcome.status === 'sent' || outcome.status === 'dry_run') return { ok: true };
  return { ok: false, error: outcome.status === 'failed' ? outcome.error : 'ارسال پیامک ناموفق بود' };
}
