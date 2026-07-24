/**
 * Route-level tests for GET /api/dashboard/branch-comparison.
 * No database connection required (getBranchCogsWaste itself is mocked).
 *
 * پوشش: فقط SuperAdmin مجاز است (مقایسه‌ی بین‌شعبه‌ای ذاتاً یک نمای
 * مدیریتی است)؛ from/to نامعتبر → ۴۰۰ کنترل‌شده، نه throw.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRequireSession, mockGetBranchCogsWaste } = vi.hoisted(() => ({
  mockRequireSession: vi.fn(),
  mockGetBranchCogsWaste: vi.fn(),
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

vi.mock('@/lib/reports/periodReport', () => ({
  getBranchCogsWaste: mockGetBranchCogsWaste,
}));

vi.mock('@/lib/api-error', async () => {
  const { UnauthorizedError, ForbiddenError } = await import('@/lib/auth/session');
  return {
    handleError: (e: unknown) => {
      if (e instanceof UnauthorizedError) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      if (e instanceof ForbiddenError) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
      return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
    },
  };
});

import { GET } from '@/app/api/dashboard/branch-comparison/route';

function makeRequest(query = ''): Request {
  return new Request(`http://localhost/api/dashboard/branch-comparison${query}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetBranchCogsWaste.mockResolvedValue([]);
});

describe('GET branch-comparison — فقط SuperAdmin', () => {
  it.each(['BranchUser', 'Warehouse', 'Chef'] as const)('%s → 403', async (role) => {
    mockRequireSession.mockResolvedValue({ sub: 'u1', role, branchId: 'branch-1' });
    const res = await GET(makeRequest('?from=۱۴۰۵/۰۱/۰۱&to=۱۴۰۵/۰۱/۰۷'));
    expect(res.status).toBe(403);
  });

  it('SuperAdmin → 200', async () => {
    mockRequireSession.mockResolvedValue({ sub: 'u2', role: 'SuperAdmin', branchId: null });
    const res = await GET(makeRequest('?from=۱۴۰۵/۰۱/۰۱&to=۱۴۰۵/۰۱/۰۷'));
    expect(res.status).toBe(200);
    expect(mockGetBranchCogsWaste).toHaveBeenCalledWith({ fromJalali: '۱۴۰۵/۰۱/۰۱', toJalali: '۱۴۰۵/۰۱/۰۷' });
  });
});

describe('GET branch-comparison — اعتبارسنجی from/to', () => {
  it('بدون from/to → ۴۰۰ (نه throw)', async () => {
    mockRequireSession.mockResolvedValue({ sub: 'u3', role: 'SuperAdmin', branchId: null });
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
  });

  it('فرمت نامعتبر → ۴۰۰', async () => {
    mockRequireSession.mockResolvedValue({ sub: 'u4', role: 'SuperAdmin', branchId: null });
    const res = await GET(makeRequest('?from=not-a-date&to=۱۴۰۵/۰۱/۰۷'));
    expect(res.status).toBe(400);
  });
});
