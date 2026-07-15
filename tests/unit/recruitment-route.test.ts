/**
 * Route-level tests for POST /api/recruitment — notification wiring.
 * No database connection required.
 *
 * Strategy: partial mock of @/lib/recruitment/notify — the REAL
 * fireRecruitmentNotification runs (wrapped in a spy), while its two
 * dependencies (@/lib/notify.notifyAdmins and @/lib/logger.logEvent)
 * are mocked so we can control success / rejection without a DB.
 *
 * Proves:
 *  ۱. درخواست معتبر → 201
 *  ۲. fireRecruitmentNotification دقیقاً یک بار با {id, firstName, lastName, area} فراخوانی می‌شود
 *  ۳. وقتی notifyAdmins واقعاً reject می‌کند، پاسخ هنوز 201 است و catch handler اجرا می‌شود
 *  ۴. هیچ فیلد حساسی (phone, resume, answers, manualInfo, ...) به notifier نمی‌رسد
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted handles — referenced in vi.mock factories ────────────────────────
const { mockNotifyAdmins, mockLogEvent, mockInsertReturning, mockSelectWhere } =
  vi.hoisted(() => ({
    mockNotifyAdmins: vi.fn(),
    mockLogEvent: vi.fn(),
    mockInsertReturning: vi.fn(),
    mockSelectWhere: vi.fn(),
  }));

// ── Partial mock: real fireRecruitmentNotification wrapped in a spy ───────────
// importOriginal loads the actual source; its own imports (@/lib/notify,
// @/lib/logger) resolve through the mocks below — no real DB or SMS call occurs.
vi.mock('@/lib/recruitment/notify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/recruitment/notify')>();
  return {
    ...actual,
    fireRecruitmentNotification: vi.fn(actual.fireRecruitmentNotification),
  };
});

// notifyAdmins is the real async boundary; mock it to control success/rejection
vi.mock('@/lib/notify', () => ({ notifyAdmins: mockNotifyAdmins }));

// logEvent is called inside the .catch() of fireRecruitmentNotification; mock to assert
vi.mock('@/lib/logger', () => ({ logEvent: mockLogEvent }));

// ── DB and infrastructure mocks ───────────────────────────────────────────────

vi.mock('@/lib/db/client', () => ({
  db: {
    insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: mockInsertReturning })) })),
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: mockSelectWhere })) })),
  },
  schema: {
    jobApplications: {
      id: 'col_id', firstName: 'col_firstName', lastName: 'col_lastName',
      area: 'col_area', phone: 'col_phone', age: 'col_age', gender: 'col_gender',
      city: 'col_city', hasResume: 'col_hasResume', resumeUrl: 'col_resumeUrl',
      resumePath: 'col_resumePath', manualInfo: 'col_manualInfo',
      answers: 'col_answers', shiftAvailability: 'col_shiftAvailability',
      startAvailability: 'col_startAvailability', referralSource: 'col_referralSource',
      customFields: 'col_customFields', fieldSnapshot: 'col_fieldSnapshot',
    },
    formFields: {
      id: 'col_ff_id', key: 'col_ff_key', label: 'col_ff_label',
      type: 'col_ff_type', isSystem: 'col_ff_isSystem', isActive: 'col_ff_isActive',
    },
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(() => '__eq__'),
  desc: vi.fn(() => '__desc__'),
  and: vi.fn(() => '__and__'),
  asc: vi.fn(() => '__asc__'),
  count: vi.fn(() => '__count__'),
}));

vi.mock('@/lib/auth/rateLimit', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true })),
  recordFailedAttempt: vi.fn(),
  getClientIp: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/validations/recruitment', () => ({
  applicationCreateSchema: { parse: (v: unknown) => v },
}));

vi.mock('@/lib/auth/session', () => ({ requireAdmin: vi.fn() }));

vi.mock('@/lib/api-error', () => {
  class ApiError extends Error {
    status: number;
    code?: string;
    constructor(status: number, message: string, code?: string) {
      super(message);
      this.status = status;
      this.code = code;
    }
  }
  return {
    ApiError,
    handleError: (e: unknown) => {
      const status = e instanceof ApiError ? e.status : 500;
      return new Response(JSON.stringify({ error: String(e) }), { status });
    },
  };
});

vi.mock('@/lib/recruitment/form-types', () => ({ SYSTEM_FIELD_COLUMN_MAP: {} }));

// ── Imports after mocks ───────────────────────────────────────────────────────
import { POST } from '@/app/api/recruitment/route';
import { fireRecruitmentNotification } from '@/lib/recruitment/notify';

const spyFire = vi.mocked(fireRecruitmentNotification);

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makePostRequest(body: unknown): Request {
  return new Request('http://localhost/api/recruitment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '127.0.0.1' },
    body: JSON.stringify(body),
  });
}

/** body includes sensitive fields; only name and area may reach the notifier */
const VALID_BODY = {
  firstName: 'علی',
  lastName: 'احمدی',
  phone: '09121234567',
  area: 'kitchen',
  hasResume: true,
  resumeUrl: 'data:application/pdf;base64,AAAA==',
  manualInfo: 'سابقه کاری: ...',
  shiftAvailability: ['morning'],
  answers: { q1: 'پاسخ حساس' },
  customFields: {},
};

/** Exactly what the DB returning() clause yields — four allowed columns only */
const DB_ROW = {
  id: 'app-test-uuid',
  firstName: 'علی',
  lastName: 'احمدی',
  area: 'kitchen' as string | null,
};

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // Re-establish implementations cleared by any previous test override
  mockInsertReturning.mockResolvedValue([DB_ROW]);
  mockSelectWhere.mockResolvedValue([]);
  mockNotifyAdmins.mockResolvedValue(undefined); // happy-path default
  mockLogEvent.mockResolvedValue(undefined);
  // spyFire calls through to the real function — no override needed
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/recruitment — درخواست معتبر → 201', () => {
  it('پاسخ 201 با ok:true و id صحیح برمی‌گرداند', async () => {
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(201);
    const json = await res.json() as { ok: boolean; id: string };
    expect(json.ok).toBe(true);
    expect(json.id).toBe(DB_ROW.id);
  });

  it('fireRecruitmentNotification (واقعی) دقیقاً یک بار فراخوانی می‌شود', async () => {
    await POST(makePostRequest(VALID_BODY));
    expect(spyFire).toHaveBeenCalledOnce();
  });
});

describe('POST /api/recruitment — notification rejection نمی‌تواند 201 را تغییر دهد', () => {
  it('وقتی notifyAdmins واقعاً reject می‌کند، route هنوز 201 برمی‌گرداند', async () => {
    // Make the real notifyAdmins (inside the real fireRecruitmentNotification) reject
    mockNotifyAdmins.mockRejectedValue(new Error('Kavenegar unavailable'));

    const res = await POST(makePostRequest(VALID_BODY));

    // 201 is returned before notifyAdmins settles — fire-and-forget
    expect(res.status).toBe(201);

    // Drain the event loop so the .catch() inside fireRecruitmentNotification runs
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    // notifyAdmins was attempted
    expect(mockNotifyAdmins).toHaveBeenCalledOnce();

    // The catch handler in fireRecruitmentNotification called logEvent — rejection absorbed
    expect(mockLogEvent).toHaveBeenCalledOnce();
    expect(mockLogEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'warn',
        category: 'recruitment',
        context: { entityId: DB_ROW.id },
      }),
    );
  });
});

describe('POST /api/recruitment — جداسازی فیلدهای حساس', () => {
  it('fireRecruitmentNotification فقط {id, firstName, lastName, area} دریافت می‌کند', async () => {
    await POST(makePostRequest(VALID_BODY));

    // Spy records the args passed to the real function
    const callArg = spyFire.mock.calls[0]![0] as Record<string, unknown>;

    // Must exactly equal the four-column DB row — toEqual fails on any extra key
    expect(callArg).toEqual(DB_ROW);

    // Explicit check for sensitive fields that must not be forwarded
    const FORBIDDEN = [
      'phone', 'resumeUrl', 'resumePath', 'manualInfo',
      'answers', 'customFields', 'age', 'gender', 'city',
      'hasResume', 'shiftAvailability', 'startAvailability',
      'referralSource', 'fieldSnapshot',
    ];
    for (const field of FORBIDDEN) {
      expect(
        Object.prototype.hasOwnProperty.call(callArg, field),
        `فیلد حساس "${field}" نباید به notifier برسد`,
      ).toBe(false);
    }
  });
});
