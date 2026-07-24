/**
 * Route-level tests for GET /api/inventory/reports/exceptions.
 * No database connection required.
 *
 * Proves:
 *  ۱. SuperAdmin می‌تواند branchId درخواستی (هر شعبه‌ای) را ببیند.
 *  ۲. BranchUser/Warehouse همیشه فقط branchId نشست خودشان را می‌بینند —
 *     حتی اگر یک branchId متفاوت در query string بفرستند (جلوگیری از
 *     دسترسی متقاطع شعبه).
 *  ۳. نقشی که به بخش inventory دسترسی ندارد (Chef) → 403.
 *  ۴. نشست بدون branchId (BranchUser/Warehouse) → 400 کنترل‌شده، نه کرش.
 *  ۵. clampWarnings بر اساس branchId داخل meta فیلتر می‌شود، نه کل audit_log.
 *  ۶. meta نامعتبر (JSON مخدوش، null، primitive) هرگز باعث 500 نمی‌شود —
 *     فقط از نتیجه حذف می‌شود؛ ردیف‌های معتبر کنار ردیف‌های نامعتبر درست کار می‌کنند.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRequireSession, mockSelectWhere, mockEq } = vi.hoisted(() => ({
  mockRequireSession: vi.fn(),
  mockSelectWhere: vi.fn(),
  mockEq: vi.fn((col: unknown, val: unknown) => ({ __eq: true, col, val })),
}));

vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: mockSelectWhere })) })),
  },
  schema: {
    invVouchers: {
      id: 'col_id', no: 'col_no', kind: 'col_kind', createdAt: 'col_createdAt',
      branchId: 'col_branchId', status: 'col_status', parentVoucherId: 'col_parentVoucherId',
    },
    auditLog: { id: 'col_id', meta: 'col_meta', createdAt: 'col_createdAt', action: 'col_action' },
    invItems: {
      id: 'col_id', name: 'col_name', qtyPhysical: 'col_qtyPhysical',
      minBase: 'col_minBase', unit: 'col_unit', branchId: 'col_branchId', isActive: 'col_isActive',
    },
  },
}));

vi.mock('drizzle-orm', () => ({
  and: vi.fn((...args: unknown[]) => args),
  eq: mockEq,
  lt: vi.fn(() => '__lt__'),
  gt: vi.fn(() => '__gt__'),
  isNotNull: vi.fn(() => '__isNotNull__'),
  sql: vi.fn(() => '__sql__'),
}));

vi.mock('@/lib/auth/session', () => {
  class UnauthorizedError extends Error {
    constructor() { super('Unauthorized'); this.name = 'UnauthorizedError'; }
  }
  class ForbiddenError extends Error {
    constructor() { super('Forbidden'); this.name = 'ForbiddenError'; }
  }
  return { requireSession: mockRequireSession, UnauthorizedError, ForbiddenError };
});

vi.mock('@/lib/api-error', async () => {
  const { UnauthorizedError, ForbiddenError } = await import('@/lib/auth/session');
  return {
    handleError: (e: unknown) => {
      if (e instanceof UnauthorizedError) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      if (e instanceof ForbiddenError) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
      return new Response(JSON.stringify({ error: 'Internal' }), { status: 500 });
    },
  };
});

// canAccessSection واقعی — تست منطق واقعی مجوز بخش‌ها، نه mock جعلی
import { GET } from '@/app/api/inventory/reports/exceptions/route';

function makeRequest(branchId?: string): Request {
  const url = branchId
    ? `http://localhost/api/inventory/reports/exceptions?branchId=${branchId}`
    : 'http://localhost/api/inventory/reports/exceptions';
  return new Request(url);
}

/** ترتیب فراخوانی در route: stalePending, clampWarnings, belowMin, pendingReversals */
function queueEmptyResults() {
  mockSelectWhere
    .mockResolvedValueOnce([]) // stalePending
    .mockResolvedValueOnce([]) // clampWarnings raw
    .mockResolvedValueOnce([]) // belowMin
    .mockResolvedValueOnce([]); // pendingReversals
}

beforeEach(() => {
  vi.clearAllMocks();
  mockEq.mockImplementation((col: unknown, val: unknown) => ({ __eq: true, col, val }));
});

describe('GET exceptions — SuperAdmin می‌تواند هر branchId درخواستی را ببیند', () => {
  it('branchId ارسالی در query برای فیلتر واقعی استفاده می‌شود', async () => {
    mockRequireSession.mockResolvedValue({ sub: 'u1', role: 'SuperAdmin', branchId: null });
    queueEmptyResults();

    const res = await GET(makeRequest('branch-99'));
    expect(res.status).toBe(200);

    const branchIdCalls = mockEq.mock.calls.filter(([col]) => col === 'col_branchId');
    expect(branchIdCalls.length).toBeGreaterThan(0);
    for (const [, val] of branchIdCalls) expect(val).toBe('branch-99');
  });
});

describe('GET exceptions — BranchUser/Warehouse فقط شعبه‌ی نشست خودشان', () => {
  it.each(['BranchUser', 'Warehouse'] as const)(
    '%s نمی‌تواند با ارسال branchId دیگر به شعبه‌ی دیگر دسترسی پیدا کند',
    async (role) => {
      mockRequireSession.mockResolvedValue({ sub: 'u2', role, branchId: 'branch-own' });
      queueEmptyResults();

      // کاربر غیرمدیر عمداً branchId شعبه‌ی دیگری می‌فرستد
      const res = await GET(makeRequest('branch-attacker-target'));
      expect(res.status).toBe(200);

      const branchIdCalls = mockEq.mock.calls.filter(([col]) => col === 'col_branchId');
      expect(branchIdCalls.length).toBeGreaterThan(0);
      for (const [, val] of branchIdCalls) {
        expect(val).toBe('branch-own');
        expect(val).not.toBe('branch-attacker-target');
      }
    },
  );

  it('بدون ارسال branchId هم فقط شعبه‌ی نشست فیلتر می‌شود', async () => {
    mockRequireSession.mockResolvedValue({ sub: 'u3', role: 'BranchUser', branchId: 'branch-own' });
    queueEmptyResults();

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const branchIdCalls = mockEq.mock.calls.filter(([col]) => col === 'col_branchId');
    for (const [, val] of branchIdCalls) expect(val).toBe('branch-own');
  });
});

describe('GET exceptions — نشست بدون شعبه', () => {
  it('BranchUser/Warehouse بدون branchId در session → خطای کنترل‌شده ۴۰۰ (نه کرش)', async () => {
    mockRequireSession.mockResolvedValue({ sub: 'u4', role: 'BranchUser', branchId: null });
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(typeof json.error).toBe('string');
  });
});

describe('GET exceptions — دسترسی بخش inventory', () => {
  it('نقشی بدون دسترسی به بخش inventory (Chef) → 403', async () => {
    mockRequireSession.mockResolvedValue({ sub: 'u5', role: 'Chef', branchId: 'branch-own' });
    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
  });
});

describe('GET exceptions — clampWarnings با branchId داخل meta فیلتر می‌شود', () => {
  it('فقط ردیف‌هایی که meta.branchId با effectiveBranchId مطابقت دارد برگردانده می‌شوند', async () => {
    mockRequireSession.mockResolvedValue({ sub: 'u6', role: 'SuperAdmin', branchId: null });
    const now = new Date();
    mockSelectWhere
      .mockResolvedValueOnce([]) // stalePending
      .mockResolvedValueOnce([
        { id: 'w1', meta: JSON.stringify({ branchId: 'branch-a', itemId: 'i1', shortfall: 3 }), createdAt: now },
        { id: 'w2', meta: JSON.stringify({ branchId: 'branch-b', itemId: 'i2', shortfall: 5 }), createdAt: now },
        { id: 'w3', meta: JSON.stringify({ branchId: 'branch-a', itemId: 'i3', shortfall: 1 }), createdAt: now },
      ]) // clampWarnings raw — دو شعبه‌ی متفاوت
      .mockResolvedValueOnce([]) // belowMin
      .mockResolvedValueOnce([]); // pendingReversals

    const res = await GET(makeRequest('branch-a'));
    expect(res.status).toBe(200);
    const json = await res.json() as { clampWarnings: { count: number; items: Array<{ itemId: string }> } };
    expect(json.clampWarnings.count).toBe(2);
    expect(json.clampWarnings.items.map(i => i.itemId).sort()).toEqual(['i1', 'i3']);
  });
});

describe('GET exceptions — meta نامعتبر هرگز 500 نمی‌سازد', () => {
  it('JSON مخدوش (malformed) → 200، ردیف نادیده گرفته می‌شود', async () => {
    mockRequireSession.mockResolvedValue({ sub: 'u7', role: 'SuperAdmin', branchId: null });
    mockSelectWhere
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'w1', meta: '{not valid json', createdAt: new Date() }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const res = await GET(makeRequest('branch-a'));
    expect(res.status).toBe(200);
    const json = await res.json() as { clampWarnings: { count: number } };
    expect(json.clampWarnings.count).toBe(0);
  });

  it('meta=null → 200، ردیف نادیده گرفته می‌شود', async () => {
    mockRequireSession.mockResolvedValue({ sub: 'u8', role: 'SuperAdmin', branchId: null });
    mockSelectWhere
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'w1', meta: null, createdAt: new Date() }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const res = await GET(makeRequest('branch-a'));
    expect(res.status).toBe(200);
    const json = await res.json() as { clampWarnings: { count: number } };
    expect(json.clampWarnings.count).toBe(0);
  });

  it('meta=رشته‌ی JSON معتبرِ primitive ("42"، "null"، آرایه) → 200، نادیده گرفته می‌شود', async () => {
    mockRequireSession.mockResolvedValue({ sub: 'u9', role: 'SuperAdmin', branchId: null });
    const now = new Date();
    mockSelectWhere
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: 'w1', meta: '42', createdAt: now },
        { id: 'w2', meta: 'null', createdAt: now },
        { id: 'w3', meta: '"just-a-string"', createdAt: now },
        { id: 'w4', meta: '[1,2,3]', createdAt: now },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const res = await GET(makeRequest('branch-a'));
    expect(res.status).toBe(200);
    const json = await res.json() as { clampWarnings: { count: number } };
    expect(json.clampWarnings.count).toBe(0);
  });

  it('meta بدون فیلد branchId → 200، ردیف در فیلتر شعبه مطابقت نمی‌کند و نادیده گرفته می‌شود', async () => {
    mockRequireSession.mockResolvedValue({ sub: 'u10', role: 'SuperAdmin', branchId: null });
    mockSelectWhere
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'w1', meta: JSON.stringify({ itemId: 'i9', shortfall: 2 }), createdAt: new Date() }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const res = await GET(makeRequest('branch-a'));
    expect(res.status).toBe(200);
    const json = await res.json() as { clampWarnings: { count: number } };
    expect(json.clampWarnings.count).toBe(0);
  });

  it('ترکیب ردیف‌های معتبر و نامعتبر — فقط معتبرها و فقط شعبه‌ی درست برمی‌گردند، بدون 500', async () => {
    mockRequireSession.mockResolvedValue({ sub: 'u11', role: 'SuperAdmin', branchId: null });
    const now = new Date();
    mockSelectWhere
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: 'w1', meta: JSON.stringify({ branchId: 'branch-a', itemId: 'ok1', shortfall: 1 }), createdAt: now }, // معتبر، شعبه‌ی درست
        { id: 'w2', meta: '{broken', createdAt: now }, // JSON مخدوش
        { id: 'w3', meta: null, createdAt: now }, // null
        { id: 'w4', meta: '99', createdAt: now }, // primitive
        { id: 'w5', meta: JSON.stringify({ branchId: 'branch-b', itemId: 'wrong-branch', shortfall: 9 }), createdAt: now }, // معتبر، شعبه‌ی غلط
        { id: 'w6', meta: JSON.stringify({ branchId: 'branch-a', itemId: 'ok2', shortfall: 4 }), createdAt: now }, // معتبر، شعبه‌ی درست
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const res = await GET(makeRequest('branch-a'));
    expect(res.status).toBe(200);
    const json = await res.json() as { clampWarnings: { count: number; items: Array<{ itemId: string }> } };
    expect(json.clampWarnings.count).toBe(2);
    expect(json.clampWarnings.items.map(i => i.itemId).sort()).toEqual(['ok1', 'ok2']);
  });
});
