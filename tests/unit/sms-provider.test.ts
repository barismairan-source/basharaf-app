/**
 * SMS provider layer — dispatcher, phone normalization, and both provider
 * adapters (Kavenegar, MeliPayamak). No database — these are all pure
 * functions or network-call-mocked adapters.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { normalizeIranPhone } from '@/lib/sms/phone';

// ─── phone normalization ───────────────────────────────────────────

describe('normalizeIranPhone', () => {
  it('passes through an already-valid 09xxxxxxxxx number', () => {
    expect(normalizeIranPhone('09121234567')).toBe('09121234567');
  });

  it('normalizes a 10-digit number starting with 9', () => {
    expect(normalizeIranPhone('9121234567')).toBe('09121234567');
  });

  it('normalizes +98 international format', () => {
    expect(normalizeIranPhone('+989121234567')).toBe('09121234567');
  });

  it('normalizes 0098 international format', () => {
    expect(normalizeIranPhone('00989121234567')).toBe('09121234567');
  });

  it('normalizes bare 98 country code format', () => {
    expect(normalizeIranPhone('989121234567')).toBe('09121234567');
  });

  it('strips spaces and dashes', () => {
    expect(normalizeIranPhone('0912 123 4567')).toBe('09121234567');
    expect(normalizeIranPhone('0912-123-4567')).toBe('09121234567');
  });

  it('converts Persian digits', () => {
    expect(normalizeIranPhone('۰۹۱۲۱۲۳۴۵۶۷')).toBe('09121234567');
  });

  it('rejects landline / short / malformed numbers', () => {
    expect(normalizeIranPhone('02112345678')).toBeNull();
    expect(normalizeIranPhone('0912123')).toBeNull();
    expect(normalizeIranPhone('not-a-phone')).toBeNull();
    expect(normalizeIranPhone('')).toBeNull();
  });
});

// ─── dispatcher: resolveSmsProvider / getSmsProviderStatus (pure) ──

describe('resolveSmsProvider', () => {
  const ENV_KEYS = ['SMS_PROVIDER', 'KAVENEGAR_API_KEY', 'MELIPAYAMAK_TOKEN', 'MELIPAYAMAK_FROM'];
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = {};
    for (const k of ENV_KEYS) { saved[k] = process.env[k]; delete process.env[k]; }
  });
  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] !== undefined) process.env[k] = saved[k];
      else delete process.env[k];
    }
  });

  it('selects melipayamak when SMS_PROVIDER=melipayamak', async () => {
    process.env.SMS_PROVIDER = 'melipayamak';
    const { resolveSmsProvider } = await import('@/lib/sms/dispatcher');
    expect(resolveSmsProvider()).toEqual({ name: 'melipayamak' });
  });

  it('selects kavenegar when SMS_PROVIDER=kavenegar', async () => {
    process.env.SMS_PROVIDER = 'kavenegar';
    const { resolveSmsProvider } = await import('@/lib/sms/dispatcher');
    expect(resolveSmsProvider()).toEqual({ name: 'kavenegar' });
  });

  it('is case-insensitive', async () => {
    process.env.SMS_PROVIDER = 'MeliPayamak';
    const { resolveSmsProvider } = await import('@/lib/sms/dispatcher');
    expect(resolveSmsProvider()).toEqual({ name: 'melipayamak' });
  });

  it('falls back to kavenegar for backward compatibility when SMS_PROVIDER is unset', async () => {
    process.env.KAVENEGAR_API_KEY = 'legacy-key';
    const { resolveSmsProvider } = await import('@/lib/sms/dispatcher');
    expect(resolveSmsProvider()).toEqual({ name: 'kavenegar' });
  });

  it('falls back to kavenegar even when KAVENEGAR_API_KEY is also absent (preserves pre-existing dry-run-when-unconfigured behavior)', async () => {
    const { resolveSmsProvider } = await import('@/lib/sms/dispatcher');
    expect(resolveSmsProvider()).toEqual({ name: 'kavenegar' });
  });

  it('fails closed on an invalid provider name', async () => {
    process.env.SMS_PROVIDER = 'twilio';
    const { resolveSmsProvider } = await import('@/lib/sms/dispatcher');
    const result = resolveSmsProvider();
    expect(result.name).toBeNull();
    expect(result.error).toContain('twilio');
    expect(result.error).toContain('kavenegar');
    expect(result.error).toContain('melipayamak');
  });

  it('getSmsProviderStatus reports configured=false for melipayamak with incomplete env', async () => {
    process.env.SMS_PROVIDER = 'melipayamak';
    process.env.MELIPAYAMAK_TOKEN = 't';
    // from intentionally left unset
    const { getSmsProviderStatus } = await import('@/lib/sms/dispatcher');
    const status = getSmsProviderStatus();
    expect(status.provider).toBe('melipayamak');
    expect(status.configured).toBe(false);
  });

  it('getSmsProviderStatus reports configured=true for melipayamak with complete env', async () => {
    process.env.SMS_PROVIDER = 'melipayamak';
    process.env.MELIPAYAMAK_TOKEN = 't';
    process.env.MELIPAYAMAK_FROM = '3000';
    const { getSmsProviderStatus } = await import('@/lib/sms/dispatcher');
    const status = getSmsProviderStatus();
    expect(status.provider).toBe('melipayamak');
    expect(status.configured).toBe(true);
  });

  it('getSmsProviderStatus reports provider=null when SMS_PROVIDER is invalid', async () => {
    process.env.SMS_PROVIDER = 'nope';
    const { getSmsProviderStatus } = await import('@/lib/sms/dispatcher');
    const status = getSmsProviderStatus();
    expect(status.provider).toBeNull();
    expect(status.configured).toBe(false);
  });
});

// ─── dispatchSms wiring — invalid provider never calls any adapter ─

describe('dispatchSms', () => {
  const ENV_KEYS = ['SMS_PROVIDER', 'KAVENEGAR_API_KEY', 'SMS_DRY_RUN'];
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = {};
    for (const k of ENV_KEYS) { saved[k] = process.env[k]; delete process.env[k]; }
  });
  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] !== undefined) process.env[k] = saved[k];
      else delete process.env[k];
    }
  });

  it('returns a failed outcome with provider=null for an invalid SMS_PROVIDER, without any network call', async () => {
    process.env.SMS_PROVIDER = 'twilio';
    const fetchSpy = vi.spyOn(global, 'fetch');
    const { dispatchSms } = await import('@/lib/sms/dispatcher');
    const result = await dispatchSms('09121234567', 'hello');
    expect(result.provider).toBeNull();
    expect(result.outcome.status).toBe('failed');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('routes to kavenegar dry-run when unconfigured (backward compat, no network call)', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    const { dispatchSms } = await import('@/lib/sms/dispatcher');
    const result = await dispatchSms('09121234567', 'hello');
    expect(result.provider).toBe('kavenegar');
    expect(result.outcome.status).toBe('dry_run');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

// ─── melipayamakSend — request shape, response mapping, errors ────

describe('melipayamakSend', () => {
  const ENV_KEYS = ['MELIPAYAMAK_TOKEN', 'MELIPAYAMAK_FROM', 'SMS_DRY_RUN'];
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = {};
    for (const k of ENV_KEYS) { saved[k] = process.env[k]; delete process.env[k]; }
    vi.restoreAllMocks();
  });
  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] !== undefined) process.env[k] = saved[k];
      else delete process.env[k];
    }
    vi.restoreAllMocks();
  });

  it('dry-runs without any network call when SMS_DRY_RUN=true, even with no credentials configured', async () => {
    process.env.SMS_DRY_RUN = 'true';
    const fetchSpy = vi.spyOn(global, 'fetch');
    const { melipayamakSend } = await import('@/lib/sms/melipayamak');
    const result = await melipayamakSend('09121234567', 'hello');
    expect(result.status).toBe('dry_run');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fails closed with a clear message when configuration is incomplete (dry-run off)', async () => {
    process.env.MELIPAYAMAK_TOKEN = 'ae938c27199344e5970c5a3dbbc85507';
    // FROM missing
    const fetchSpy = vi.spyOn(global, 'fetch');
    const { melipayamakSend } = await import('@/lib/sms/melipayamak');
    const result = await melipayamakSend('09121234567', 'hello');
    expect(result.status).toBe('failed');
    if (result.status === 'failed') {
      expect(result.error).toContain('ملی‌پیامک');
      expect(result.error).not.toContain('ae938c27199344e5970c5a3dbbc85507'); // never echo the token back
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sends the correct JSON body to the token-scoped URL', async () => {
    process.env.MELIPAYAMAK_TOKEN = 'my-token-123';
    process.env.MELIPAYAMAK_FROM = '50004000790780';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ recId: 3741437414, status: '' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { melipayamakSend } = await import('@/lib/sms/melipayamak');
    await melipayamakSend('09121234567', 'سلام');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://console.melipayamak.com/api/send/simple/my-token-123');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');

    const body = JSON.parse(init.body as string);
    expect(body).toEqual({ from: '50004000790780', to: '09121234567', text: 'سلام' });
  });

  it('maps a positive recId with empty status to sent, with recId as providerMessageId', async () => {
    process.env.MELIPAYAMAK_TOKEN = 't';
    process.env.MELIPAYAMAK_FROM = '3000';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ recId: 3741437414, status: '' }),
    }));

    const { melipayamakSend } = await import('@/lib/sms/melipayamak');
    const result = await melipayamakSend('09121234567', 'hi');
    expect(result.status).toBe('sent');
    if (result.status === 'sent') {
      expect(result.providerMessageId).toBe('3741437414');
      expect(result.providerResponse).toEqual({ recId: 3741437414, status: '' });
    }
  });

  it('maps a non-empty status to failed with the provider error text', async () => {
    process.env.MELIPAYAMAK_TOKEN = 't';
    process.env.MELIPAYAMAK_FROM = '3000';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ recId: 0, status: 'Invalid receptor number' }),
    }));

    const { melipayamakSend } = await import('@/lib/sms/melipayamak');
    const result = await melipayamakSend('09121234567', 'hi');
    expect(result.status).toBe('failed');
    if (result.status === 'failed') {
      expect(result.error).toContain('Invalid receptor number');
    }
  });

  it('maps a network/timeout error to failed without leaking the token', async () => {
    process.env.MELIPAYAMAK_TOKEN = 'super-secret-token';
    process.env.MELIPAYAMAK_FROM = '3000';
    const abortError = new Error('The operation was aborted');
    abortError.name = 'TimeoutError';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));

    const { melipayamakSend } = await import('@/lib/sms/melipayamak');
    const result = await melipayamakSend('09121234567', 'hi');
    expect(result.status).toBe('failed');
    if (result.status === 'failed') {
      expect(result.error.toLowerCase()).toContain('timeout');
      expect(result.error).not.toContain('super-secret-token');
    }
  });

  it('never includes the token in a generic network error message that echoes the request URL', async () => {
    process.env.MELIPAYAMAK_TOKEN = 'super-secret-token';
    process.env.MELIPAYAMAK_FROM = '3000';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(
      new Error('request to https://console.melipayamak.com/api/send/simple/super-secret-token failed')
    ));

    const { melipayamakSend } = await import('@/lib/sms/melipayamak');
    const result = await melipayamakSend('09121234567', 'hi');
    expect(result.status).toBe('failed');
    if (result.status === 'failed') {
      expect(result.error).not.toContain('super-secret-token');
    }
  });
});

// ─── kavenegarSend — timeout + redaction additions, behavior preserved ─

describe('kavenegarSend', () => {
  const ENV_KEYS = ['KAVENEGAR_API_KEY', 'SMS_DRY_RUN'];
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = {};
    for (const k of ENV_KEYS) { saved[k] = process.env[k]; delete process.env[k]; }
    vi.restoreAllMocks();
  });
  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] !== undefined) process.env[k] = saved[k];
      else delete process.env[k];
    }
    vi.restoreAllMocks();
  });

  it('dry-runs when KAVENEGAR_API_KEY is absent (preserved historical behavior)', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    const { kavenegarSend } = await import('@/lib/sms/kavenegar');
    const result = await kavenegarSend('09121234567', 'hi');
    expect(result.status).toBe('dry_run');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('dry-runs when SMS_DRY_RUN=true even with a key present (preserved historical behavior)', async () => {
    process.env.KAVENEGAR_API_KEY = 'real-key';
    process.env.SMS_DRY_RUN = 'true';
    const fetchSpy = vi.spyOn(global, 'fetch');
    const { kavenegarSend } = await import('@/lib/sms/kavenegar');
    const result = await kavenegarSend('09121234567', 'hi');
    expect(result.status).toBe('dry_run');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('maps a successful Kavenegar response to sent', async () => {
    process.env.KAVENEGAR_API_KEY = 'real-key';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ return: { status: 200 } }),
    }));
    const { kavenegarSend } = await import('@/lib/sms/kavenegar');
    const result = await kavenegarSend('09121234567', 'hi');
    expect(result.status).toBe('sent');
  });

  it('never leaks the API key in a failure error message, even when the underlying fetch error echoes the request URL', async () => {
    process.env.KAVENEGAR_API_KEY = 'top-secret-key';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(
      new Error('request to https://api.kavenegar.com/v1/top-secret-key/sms/send.json failed')
    ));
    const { kavenegarSend } = await import('@/lib/sms/kavenegar');
    const result = await kavenegarSend('09121234567', 'hi');
    expect(result.status).toBe('failed');
    if (result.status === 'failed') {
      expect(result.error).not.toContain('top-secret-key');
    }
  });
});
