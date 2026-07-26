/**
 * sendSms() — daily cap, dedup, phone normalization, and provider dispatch
 * wiring, with the database and the provider dispatcher both mocked.
 *
 * This proves the pre-existing cap/dedup/dry-run/sms_log contract is
 * unchanged by the multi-provider dispatcher introduced alongside it.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDbSelect, mockDbInsert, mockDispatchSms } = vi.hoisted(() => ({
  mockDbSelect: vi.fn(),
  mockDbInsert: vi.fn(),
  mockDispatchSms: vi.fn(),
}));

vi.mock('@/lib/db/client', () => ({
  db: { select: mockDbSelect, insert: mockDbInsert },
  schema: {
    appSettings: { key: 'col_key', value: 'col_value' },
    smsLog: {
      id: 'col_id', phone: 'col_phone', message: 'col_message',
      templateKey: 'col_templateKey', entityId: 'col_entityId',
      status: 'col_status', createdAt: 'col_createdAt',
    },
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(() => '__eq__'),
  and: vi.fn(() => '__and__'),
  gt: vi.fn(() => '__gt__'),
  gte: vi.fn(() => '__gte__'),
  lt: vi.fn(() => '__lt__'),
  inArray: vi.fn(() => '__inArray__'),
  count: vi.fn(() => '__count__'),
}));

vi.mock('@/lib/sms/dispatcher', () => ({
  dispatchSms: mockDispatchSms,
}));

import { sendSms } from '@/lib/sms/sendSms';

// ─── select chain: select().from().where() is itself awaitable, and
// also supports .limit() — mirrors both query shapes sendSms() uses ───
function selectChain(resolvedRows: unknown[]) {
  const promise = Promise.resolve(resolvedRows);
  const whereResult: PromiseLike<unknown[]> & { limit: () => Promise<unknown[]> } = {
    limit: () => promise,
    then: promise.then.bind(promise),
  } as PromiseLike<unknown[]> & { limit: () => Promise<unknown[]> };
  return { from: () => ({ where: () => whereResult }) };
}

function insertChain(returningRows: unknown[]) {
  return { values: () => ({ returning: () => Promise.resolve(returningRows) }) };
}

const NEW_LOG_ID = 'log-id-1';

beforeEach(() => {
  vi.clearAllMocks();
  mockDbInsert.mockReturnValue(insertChain([{ id: NEW_LOG_ID }]));
});

describe('sendSms — phone normalization', () => {
  it('rejects an invalid phone before any cap/dedup/dispatch logic runs', async () => {
    const result = await sendSms({ phone: 'not-a-phone', message: 'hi' });
    expect(result.status).toBe('failed');
    expect(mockDbSelect).not.toHaveBeenCalled();
    expect(mockDispatchSms).not.toHaveBeenCalled();
    expect(mockDbInsert).toHaveBeenCalledTimes(1);
  });

  it('normalizes a non-canonical phone before dedup/cap keys are built', async () => {
    mockDbSelect
      .mockReturnValueOnce(selectChain([{ value: '5' }]))   // daily cap setting
      .mockReturnValueOnce(selectChain([{ value: '2' }]))   // dedup hours setting
      .mockReturnValueOnce(selectChain([]))                 // no cap rows for count()
      ;
    mockDispatchSms.mockResolvedValue({ provider: 'kavenegar', outcome: { status: 'dry_run' } });

    await sendSms({ phone: '+989121234567', message: 'hi' });

    expect(mockDispatchSms).toHaveBeenCalledWith('09121234567', 'hi');
  });
});

describe('sendSms — dedup (no regression)', () => {
  beforeEach(() => {
    mockDbSelect
      .mockReturnValueOnce(selectChain([{ value: '5' }])) // daily cap setting
      .mockReturnValueOnce(selectChain([{ value: '2' }])); // dedup hours setting
  });

  it('returns deduped and never calls the dispatcher when a matching sms_log row exists within the window', async () => {
    mockDbSelect.mockReturnValueOnce(selectChain([{ id: 'existing-row' }])); // dedup match
    mockDbInsert.mockReturnValue(insertChain([{ id: 'deduped-log-id' }]));

    const result = await sendSms({
      phone: '09121234567', message: 'hi', templateKey: 'low_stock', entityId: 'item-1',
    });

    expect(result.status).toBe('deduped');
    expect(mockDispatchSms).not.toHaveBeenCalled();
  });

  it('proceeds to cap check and dispatch when no dedup match exists', async () => {
    mockDbSelect
      .mockReturnValueOnce(selectChain([]))    // no dedup match
      .mockReturnValueOnce(selectChain([]));   // cap count = 0 rows
    mockDispatchSms.mockResolvedValue({ provider: 'kavenegar', outcome: { status: 'dry_run' } });

    const result = await sendSms({
      phone: '09121234567', message: 'hi', templateKey: 'low_stock', entityId: 'item-1',
    });

    expect(result.status).toBe('dry_run');
    expect(mockDispatchSms).toHaveBeenCalledTimes(1);
  });

  it('skips the dedup check entirely when templateKey or entityId is missing (unchanged legacy behavior)', async () => {
    mockDbSelect.mockReturnValueOnce(selectChain([])); // cap count only — no dedup select at all
    mockDispatchSms.mockResolvedValue({ provider: 'kavenegar', outcome: { status: 'dry_run' } });

    await sendSms({ phone: '09121234567', message: 'hi' }); // no templateKey/entityId

    // exactly 3 selects: dailyCap setting, dedupHours setting, cap-count — no dedup select
    expect(mockDbSelect).toHaveBeenCalledTimes(3);
  });
});

describe('sendSms — daily cap (no regression)', () => {
  it('returns capped and never calls the dispatcher when today\'s sent count meets the cap', async () => {
    mockDbSelect
      .mockReturnValueOnce(selectChain([{ value: '3' }]))    // daily cap = 3
      .mockReturnValueOnce(selectChain([{ value: '2' }]))    // dedup hours
      .mockReturnValueOnce(selectChain([{ n: 3 }]));          // cap count = 3 (>= cap)
    mockDbInsert.mockReturnValue(insertChain([{ id: 'capped-log-id' }]));

    const result = await sendSms({ phone: '09121234567', message: 'hi' });

    expect(result.status).toBe('capped');
    expect(mockDispatchSms).not.toHaveBeenCalled();
  });

  it('dispatches when today\'s sent count is below the cap', async () => {
    mockDbSelect
      .mockReturnValueOnce(selectChain([{ value: '3' }]))
      .mockReturnValueOnce(selectChain([{ value: '2' }]))
      .mockReturnValueOnce(selectChain([{ n: 1 }]));
    mockDispatchSms.mockResolvedValue({ provider: 'kavenegar', outcome: { status: 'sent', providerResponse: { ok: true } } });

    const result = await sendSms({ phone: '09121234567', message: 'hi' });

    expect(result.status).toBe('sent');
    expect(mockDispatchSms).toHaveBeenCalledTimes(1);
  });
});

describe('sendSms — provider recorded on the sms_log row', () => {
  beforeEach(() => {
    mockDbSelect
      .mockReturnValueOnce(selectChain([{ value: '5' }]))
      .mockReturnValueOnce(selectChain([{ value: '2' }]))
      .mockReturnValueOnce(selectChain([{ n: 0 }]));
  });

  it('writes provider=melipayamak and the message id into providerResponse on a successful send', async () => {
    mockDispatchSms.mockResolvedValue({
      provider: 'melipayamak',
      outcome: { status: 'sent', providerResponse: { RetStatus: 1 }, providerMessageId: 'msg-42' },
    });
    let capturedValues: Record<string, unknown> | undefined;
    mockDbInsert.mockReturnValue({
      values: (v: Record<string, unknown>) => { capturedValues = v; return { returning: () => Promise.resolve([{ id: NEW_LOG_ID }]) }; },
    });

    await sendSms({ phone: '09121234567', message: 'hi' });

    expect(capturedValues?.provider).toBe('melipayamak');
    expect((capturedValues?.providerResponse as Record<string, unknown>)?.provider).toBe('melipayamak');
    expect((capturedValues?.providerResponse as Record<string, unknown>)?.messageId).toBe('msg-42');
  });

  it('writes provider="unknown" when SMS_PROVIDER was invalid and dispatch never reached a provider', async () => {
    mockDispatchSms.mockResolvedValue({
      provider: null,
      outcome: { status: 'failed', error: 'SMS_PROVIDER نامعتبر است' },
    });
    let capturedValues: Record<string, unknown> | undefined;
    mockDbInsert.mockReturnValue({
      values: (v: Record<string, unknown>) => { capturedValues = v; return { returning: () => Promise.resolve([{ id: NEW_LOG_ID }]) }; },
    });

    const result = await sendSms({ phone: '09121234567', message: 'hi' });

    expect(result.status).toBe('failed');
    expect(capturedValues?.provider).toBe('unknown');
  });
});
