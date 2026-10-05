/**
 * ارسال کد ورود مشتری (lib/sms/otp.ts) — رفع یافته‌ی B6:
 * قبلاً کد در production اصلاً پیامک نمی‌شد.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { inserted, dispatchSms, resolveSmsProvider } = vi.hoisted(() => ({
  inserted: [] as Array<Record<string, unknown>>,
  dispatchSms: vi.fn(),
  resolveSmsProvider: vi.fn(() => ({ name: 'melipayamak' })),
}));

vi.mock('@/lib/db/client', () => ({
  db: { insert: () => ({ values: (v: Record<string, unknown>) => { inserted.push(v); return Promise.resolve(); } }) },
  schema: { smsLog: {} },
}));
vi.mock('@/lib/sms/dispatcher', () => ({ dispatchSms, resolveSmsProvider }));

import { sendOtpSms } from '@/lib/sms/otp';

const ENV = { ...process.env };

beforeEach(() => {
  inserted.length = 0;
  vi.clearAllMocks();
  resolveSmsProvider.mockReturnValue({ name: 'melipayamak' });
  delete process.env.SMS_DRY_RUN;
  delete process.env.MELIPAYAMAK_OTP_BODY_ID;
  process.env.MELIPAYAMAK_TOKEN = 'tok';
});
afterEach(() => {
  process.env = { ...ENV };
  vi.unstubAllGlobals();
});

describe('sendOtpSms', () => {
  it('ملی‌پیامک با الگو: bodyId و کد به‌عنوان متغیر ارسال می‌شود', async () => {
    process.env.MELIPAYAMAK_OTP_BODY_ID = '12345';
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ recId: 99 }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const res = await sendOtpSms('09121234567', '482913');
    expect(res.ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('/api/send/shared/tok');
    expect(JSON.parse(String(init.body))).toMatchObject({ bodyId: 12345, args: ['482913'] });
    expect(dispatchSms).not.toHaveBeenCalled();
  });

  it('بدون الگو: متن ساده از provider فعال ارسال می‌شود', async () => {
    dispatchSms.mockResolvedValue({ provider: 'kavenegar', outcome: { status: 'sent' } });
    const res = await sendOtpSms('09121234567', '111222');
    expect(res.ok).toBe(true);
    expect(dispatchSms.mock.calls[0]![1]).toContain('111222');
  });

  it('خودِ کد هرگز در لاگ پیامک ذخیره نمی‌شود', async () => {
    dispatchSms.mockResolvedValue({ provider: 'kavenegar', outcome: { status: 'sent' } });
    await sendOtpSms('09121234567', '765432');
    expect(JSON.stringify(inserted)).not.toContain('765432');
    expect(inserted[0]).toMatchObject({ templateKey: 'customer_otp', status: 'sent' });
  });

  it('شکست provider ← ok=false با پیام خطا', async () => {
    dispatchSms.mockResolvedValue({ provider: 'melipayamak', outcome: { status: 'failed', error: 'rejected' } });
    const res = await sendOtpSms('09121234567', '123456');
    expect(res).toEqual({ ok: false, error: 'rejected' });
  });

  it('شماره‌ی نامعتبر ← ارسال نمی‌شود', async () => {
    const res = await sendOtpSms('123', '123456');
    expect(res.ok).toBe(false);
    expect(dispatchSms).not.toHaveBeenCalled();
  });
});
