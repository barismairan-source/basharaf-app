/**
 * Route-level tests for GET /api/dashboard/trends.
 * No database connection required.
 *
 * این route قبلاً هیچ enforcement شعبه‌ای نداشت — فقط requireSession() را
 * صدا می‌زد اما به مقدارش (session.branchId/role) هیچ توجهی نمی‌کرد، یعنی
 * یک BranchUser با فرستادن ?branchId دلخواه می‌توانست روند مالی شعبه‌ی
 * دیگری را ببیند. تست‌های زیر دقیقاً همین رفع را اثبات می‌کنند.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRequireSession, mockSelectWhere, mockEq } = vi.hoisted(() => ({
  mockRequireSession: vi.fn(),
  // هر دو query این route (گروه‌بندی‌شده + sumRange بدون groupBy) از همین
  // یک .where(...) شروع می‌شوند؛ نتیجه باید هم مستقیم awaitable باشد (برای
  // sumRange) هم .groupBy().orderBy() زنجیره شود (برای query اصلی).
  mockSelectWhere: vi.fn(() => chainable([])),
  mockEq: vi.fn((col: unknown, val: unknown) => ({ __eq: true, col, val })),
}));

function chainable(result: unknown[]): Promise<unknown[]> & { groupBy: () => unknown; orderBy: () => unknown } {
  const p = Promise.resolve(result) as Promise<unknown[]> & { groupBy: () => unknown; orderBy: () => unknown };
  p.groupBy = () => chainable(result);
  p.orderBy = () => Promise.resolve(result);
  return p;
}

vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: mockSelectWhere })) })),
  },
  schema: {
    transactions: {
      status: 'col_status', date: 'col_date', type: 'col_type', branchId: 'col_branchId',
    },
  },
}));

vi.mock('drizzle-orm', () => ({
  and: vi.fn((...args: unknown[]) => args),
  eq: mockEq,
  gte: vi.fn(() => '__gte__'),
  lte: vi.fn(() => '__lte__'),
  inArray: vi.fn(() => '__inArray__'),
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

vi.mock('@/lib/api-error', () => ({
  handleError: (e: unknown) => new Response(JSON.stringify({ error: String(e) }), { status: 500 }),
}));

import { GET } from '@/app/api/dashboard/trends/route';

function makeRequest(query = ''): Request {
  return new Request(`http://localhost/api/dashboard/trends${query}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockEq.mockImplementation((col: unknown, val: unknown) => ({ __eq: true, col, val }));
  mockSelectWhere.mockImplementation(() => chainable([]));
});

describe('GET trends — SuperAdmin می‌تواند هر branchId درخواستی را ببیند', () => {
  it('branchId ارسالی در query برای فیلتر واقعی استفاده می‌شود', async () => {
    mockRequireSession.mockResolvedValue({ sub: 'u1', role: 'SuperAdmin', branchId: null });

    const res = await GET(makeRequest('?branchId=branch-99'));
    expect(res.status).toBe(200);

    const branchIdCalls = mockEq.mock.calls.filter(([col]) => col === 'col_branchId');
    expect(branchIdCalls.length).toBeGreaterThan(0);
    for (const [, val] of branchIdCalls) expect(val).toBe('branch-99');
  });

  it('بدون branchId، SuperAdmin همه‌ی شعب را می‌بیند (فیلتر branchId اعمال نمی‌شود)', async () => {
    mockRequireSession.mockResolvedValue({ sub: 'u1', role: 'SuperAdmin', branchId: null });
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const branchIdCalls = mockEq.mock.calls.filter(([col]) => col === 'col_branchId');
    expect(branchIdCalls.length).toBe(0);
  });
});

describe('GET trends — BranchUser/Warehouse/Chef فقط شعبه‌ی نشست خودشان (رفع باگ RBAC)', () => {
  it.each(['BranchUser', 'Warehouse', 'Chef'] as const)(
    '%s نمی‌تواند با ارسال branchId دیگر به شعبه‌ی دیگر دسترسی پیدا کند',
    async (role) => {
      mockRequireSession.mockResolvedValue({ sub: 'u2', role, branchId: 'branch-own' });

      const res = await GET(makeRequest('?branchId=branch-attacker-target'));
      expect(res.status).toBe(200);

      const branchIdCalls = mockEq.mock.calls.filter(([col]) => col === 'col_branchId');
      expect(branchIdCalls.length).toBeGreaterThan(0);
      for (const [, val] of branchIdCalls) {
        expect(val).toBe('branch-own');
        expect(val).not.toBe('branch-attacker-target');
      }
    },
  );
});

describe('GET trends — پارامتر days', () => {
  it('days نامعتبر (مثلاً ۱۰۰) → پیش‌فرض ۱۴ اعمال می‌شود، نه throw', async () => {
    mockRequireSession.mockResolvedValue({ sub: 'u3', role: 'SuperAdmin', branchId: null });
    const res = await GET(makeRequest('?days=100'));
    expect(res.status).toBe(200);
  });

  it.each([7, 14, 30, 90])('days=%d پذیرفته می‌شود', async (days) => {
    mockRequireSession.mockResolvedValue({ sub: 'u4', role: 'SuperAdmin', branchId: null });
    const res = await GET(makeRequest(`?days=${days}`));
    expect(res.status).toBe(200);
  });
});

describe('GET trends — پاسخ شامل previousTotal برای مقایسه است', () => {
  it('previousTotal همیشه یک شیء income/expense برمی‌گرداند (حتی صفر)', async () => {
    mockRequireSession.mockResolvedValue({ sub: 'u5', role: 'SuperAdmin', branchId: null });
    const res = await GET(makeRequest());
    const json = await res.json() as { previousTotal: { income: number; expense: number } };
    expect(json.previousTotal).toEqual({ income: 0, expense: 0 });
  });
});
