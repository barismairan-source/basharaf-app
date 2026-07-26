import { kavenegarSend } from './kavenegar';
import { melipayamakSend } from './melipayamak';
import type { SmsProviderName, SmsSendOutcome } from './types';

export interface ResolvedProvider {
  name: SmsProviderName;
  error?: undefined;
}

export interface UnresolvedProvider {
  name: null;
  error: string;
}

/**
 * تعیین provider فعال از SMS_PROVIDER — تابع خالص (بدون شبکه/DB).
 *
 * - SMS_PROVIDER='kavenegar'|'melipayamak' → همان provider.
 * - SMS_PROVIDER تنظیم‌نشده → Kavenegar (backward compatibility؛ رفتار
 *   قبل از اضافه‌شدن این dispatcher، بدون تغییر).
 * - SMS_PROVIDER هر مقدار دیگری → fail-closed (provider نامعتبر).
 */
export function resolveSmsProvider(): ResolvedProvider | UnresolvedProvider {
  const raw = process.env.SMS_PROVIDER?.trim();
  if (!raw) {
    return { name: 'kavenegar' };
  }
  const normalized = raw.toLowerCase();
  if (normalized === 'kavenegar' || normalized === 'melipayamak') {
    return { name: normalized };
  }
  return {
    name: null,
    error: `SMS_PROVIDER نامعتبر است: «${raw}» — مقادیر مجاز: kavenegar, melipayamak`,
  };
}

/** آیا env متغیرهای لازم برای provider فعلی موجودند — بدون افشای مقدار secret. */
export function isProviderConfigured(provider: SmsProviderName): boolean {
  if (provider === 'melipayamak') {
    return !!(process.env.MELIPAYAMAK_USERNAME && process.env.MELIPAYAMAK_PASSWORD && process.env.MELIPAYAMAK_FROM);
  }
  return !!process.env.KAVENEGAR_API_KEY;
}

/** وضعیت provider فعال برای UI/route های readiness — بدون secret. */
export function getSmsProviderStatus(): { provider: SmsProviderName | null; configured: boolean } {
  const resolved = resolveSmsProvider();
  if (!resolved.name) return { provider: null, configured: false };
  return { provider: resolved.name, configured: isProviderConfigured(resolved.name) };
}

export interface SmsDispatchResult {
  /** provider واقعاً استفاده‌شده — null یعنی SMS_PROVIDER نامعتبر بود و هیچ provider فراخوانی نشد. */
  provider: SmsProviderName | null;
  outcome: SmsSendOutcome;
}

/**
 * ارسال پیامک از طریق provider فعال.
 *
 * عمداً بین دو provider fallback خودکار انجام نمی‌شود — یک timeout مبهم در
 * provider اول می‌تونه باعث بشه fallback دوباره همون پیامک رو بفرسته
 * (ارسال تکراری با هزینه‌ی واقعی)، بدون اینکه معلوم باشه provider اول
 * واقعاً fail شده یا فقط پاسخش دیر رسیده.
 */
export async function dispatchSms(phone: string, message: string): Promise<SmsDispatchResult> {
  const resolved = resolveSmsProvider();
  if (!resolved.name) {
    return { provider: null, outcome: { status: 'failed', error: resolved.error } };
  }
  const outcome = resolved.name === 'melipayamak'
    ? await melipayamakSend(phone, message)
    : await kavenegarSend(phone, message);
  return { provider: resolved.name, outcome };
}
