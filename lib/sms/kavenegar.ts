interface KavenegarResult {
  status: 'sent' | 'failed' | 'dry_run';
  providerResponse?: unknown;
  error?: string;
}

/**
 * ارسال پیامک از طریق Kavenegar.
 * اگر KAVENEGAR_API_KEY در env نباشد یا SMS_DRY_RUN=true باشد،
 * حالت dry_run فعال می‌شود: لاگ ثبت می‌شود ولی API واقعی صدا نمی‌خورد.
 */
export async function kavenegarSend(
  phone: string,
  message: string
): Promise<KavenegarResult> {
  const apiKey = process.env.KAVENEGAR_API_KEY;
  const isDryRun = !apiKey || process.env.SMS_DRY_RUN === 'true';

  if (isDryRun) {
    return { status: 'dry_run' };
  }

  try {
    const body = new URLSearchParams({ receptor: phone, message });
    const res = await fetch(
      `https://api.kavenegar.com/v1/${apiKey}/sms/send.json`,
      { method: 'POST', body }
    );
    const json: unknown = await res.json();
    const kavRes = json as { return?: { status?: number } };
    if (res.ok && kavRes?.return?.status === 200) {
      return { status: 'sent', providerResponse: json };
    }
    return { status: 'failed', providerResponse: json, error: `HTTP ${res.status}` };
  } catch (err) {
    return { status: 'failed', error: String(err) };
  }
}
