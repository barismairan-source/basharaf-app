/**
 * POST /api/recruitment/resumes-zip — bulk resume download.
 * No real database or network access.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSelectWhere, mockRequireAdmin } = vi.hoisted(() => ({
  mockSelectWhere: vi.fn(),
  mockRequireAdmin: vi.fn(),
}));

vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: mockSelectWhere })) })),
  },
  schema: {
    jobApplications: {
      id: 'col_id', firstName: 'col_firstName', lastName: 'col_lastName',
      resumeUrl: 'col_resumeUrl', resumePath: 'col_resumePath',
    },
  },
}));

vi.mock('drizzle-orm', () => ({ inArray: vi.fn(() => '__inArray__') }));
vi.mock('@/lib/auth/session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth/session')>();
  return { ...actual, requireAdmin: mockRequireAdmin };
});

import { sanitizeFilename } from '@/app/api/recruitment/resumes-zip/route';
import { POST } from '@/app/api/recruitment/resumes-zip/route';
import { UnauthorizedError } from '@/lib/auth/session';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/recruitment/resumes-zip', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

const VALID_UUID = '11111111-1111-1111-1111-111111111111';

describe('sanitizeFilename', () => {
  it('strips filesystem-unsafe characters', () => {
    expect(sanitizeFilename('علی/رضا\\?%*:|"<>')).toBe('علیرضا');
  });

  it('truncates to 80 characters', () => {
    expect(sanitizeFilename('a'.repeat(200)).length).toBe(80);
  });

  it('falls back to "resume" when the sanitized result is empty', () => {
    expect(sanitizeFilename('///???')).toBe('resume');
  });
});

describe('POST /api/recruitment/resumes-zip — validation and auth', () => {
  beforeEach(() => {
    mockRequireAdmin.mockReset();
    mockSelectWhere.mockReset();
  });

  it('rejects an empty ids array with 400', async () => {
    mockRequireAdmin.mockResolvedValue({ sub: 'admin-1', role: 'SuperAdmin' });
    const res = await POST(makeRequest({ ids: [] }));
    expect(res.status).toBe(400);
  });

  it('rejects a non-uuid id with 400', async () => {
    mockRequireAdmin.mockResolvedValue({ sub: 'admin-1', role: 'SuperAdmin' });
    const res = await POST(makeRequest({ ids: ['not-a-uuid'] }));
    expect(res.status).toBe(400);
  });

  it('rejects more than 200 ids with 400', async () => {
    mockRequireAdmin.mockResolvedValue({ sub: 'admin-1', role: 'SuperAdmin' });
    const ids = Array.from({ length: 201 }, () => VALID_UUID);
    const res = await POST(makeRequest({ ids }));
    expect(res.status).toBe(400);
  });

  it('propagates an auth failure (401) without querying the database', async () => {
    mockRequireAdmin.mockRejectedValue(new UnauthorizedError());
    const res = await POST(makeRequest({ ids: [VALID_UUID] }));
    expect(res.status).toBe(401);
    expect(mockSelectWhere).not.toHaveBeenCalled();
  });

  it('returns 404 when none of the requested applications have a resume', async () => {
    mockRequireAdmin.mockResolvedValue({ sub: 'admin-1', role: 'SuperAdmin' });
    mockSelectWhere.mockResolvedValue([
      { id: VALID_UUID, firstName: 'علی', lastName: 'رضایی', resumeUrl: null, resumePath: null },
    ]);
    const res = await POST(makeRequest({ ids: [VALID_UUID] }));
    expect(res.status).toBe(404);
  });

  it('builds a zip and returns it as an attachment when a resume exists', async () => {
    mockRequireAdmin.mockResolvedValue({ sub: 'admin-1', role: 'SuperAdmin' });
    const tinyPdfBase64 = Buffer.from('%PDF-1.4 minimal').toString('base64');
    mockSelectWhere.mockResolvedValue([
      {
        id: VALID_UUID, firstName: 'علی', lastName: 'رضایی',
        resumeUrl: `data:application/pdf;base64,${tinyPdfBase64}`,
        resumePath: 'base64:resume.pdf',
      },
    ]);
    const res = await POST(makeRequest({ ids: [VALID_UUID] }));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/zip');
    expect(res.headers.get('Content-Disposition')).toContain('attachment');
  });
});
