import { describe, it, expect } from 'vitest';
import {
  DEFAULT_FILTERS, filterCandidates, sortCandidates, statusCounts,
  paramsToFilters, filtersToParams, countActiveFilters, canViewPhone,
  type CandidateFilterState,
} from '@/lib/recruitment/filterCandidates';
import type { JobApplication } from '@/lib/recruitment/questions';
import type { User } from '@/types';

let seq = 0;
function makeCandidate(overrides: Partial<JobApplication> = {}): JobApplication {
  seq += 1;
  return {
    id: `cand-${seq}`,
    firstName: `نام${seq}`,
    lastName: 'خانوادگی',
    phone: `0912000000${seq}`,
    age: 25,
    gender: 'male',
    city: 'تهران',
    hasResume: false,
    resumePath: null,
    manualInfo: null,
    answers: {},
    area: 'hall',
    shiftAvailability: [],
    startAvailability: 'immediate',
    referralSource: 'instagram',
    status: 'new',
    score: null,
    reviewerNote: null,
    customFields: {},
    fieldSnapshot: [],
    createdAt: '2025-03-21T10:00:00.000Z',
    updatedAt: '2025-03-21T10:00:00.000Z',
    ...overrides,
  };
}

function makeUser(role: User['role']): User {
  const base = { id: 'u1', name: 'کاربر', email: 'u@example.com', initials: 'ک', lastSeen: '', joined: '' };
  if (role === 'SuperAdmin') return { ...base, role: 'SuperAdmin', assignedBranch: null };
  return { ...base, role, assignedBranch: 'branch-1' };
}

describe('filterCandidates', () => {
  it('status=all شامل همه‌ی وضعیت‌ها است', () => {
    const list = [makeCandidate({ status: 'new' }), makeCandidate({ status: 'accepted' })];
    expect(filterCandidates(list, DEFAULT_FILTERS)).toHaveLength(2);
  });

  it('فیلتر status فقط داوطلبان همان وضعیت را برمی‌گرداند', () => {
    const list = [makeCandidate({ status: 'new' }), makeCandidate({ status: 'accepted' })];
    const filters: CandidateFilterState = { ...DEFAULT_FILTERS, status: 'accepted' };
    const result = filterCandidates(list, filters);
    expect(result).toHaveLength(1);
    expect(result[0]!.status).toBe('accepted');
  });

  it('فیلتر area', () => {
    const list = [makeCandidate({ area: 'hall' }), makeCandidate({ area: 'kitchen' })];
    const filters: CandidateFilterState = { ...DEFAULT_FILTERS, area: 'kitchen' };
    expect(filterCandidates(list, filters)).toHaveLength(1);
  });

  it('فیلتر start (زمان شروع)', () => {
    const list = [
      makeCandidate({ startAvailability: 'immediate' }),
      makeCandidate({ startAvailability: 'within_week' }),
    ];
    const filters: CandidateFilterState = { ...DEFAULT_FILTERS, start: 'within_week' };
    expect(filterCandidates(list, filters)).toHaveLength(1);
  });

  it('جستجو روی نام و موبایل کار می‌کند', () => {
    const list = [
      makeCandidate({ firstName: 'علی', lastName: 'رضایی', phone: '09121234567' }),
      makeCandidate({ firstName: 'حسن', lastName: 'محمدی', phone: '09359876543' }),
    ];
    const byName: CandidateFilterState = { ...DEFAULT_FILTERS, search: 'علی' };
    expect(filterCandidates(list, byName)).toHaveLength(1);
    const byPhone: CandidateFilterState = { ...DEFAULT_FILTERS, search: '0935' };
    expect(filterCandidates(list, byPhone)).toHaveLength(1);
  });

  it('فیلتر فیلد داینامیک (customFields) — مقدار تکی', () => {
    const list = [
      makeCandidate({ customFields: { experience_level: 'senior' } }),
      makeCandidate({ customFields: { experience_level: 'junior' } }),
    ];
    const filters: CandidateFilterState = { ...DEFAULT_FILTERS, dynamicFilters: { experience_level: 'senior' } };
    expect(filterCandidates(list, filters)).toHaveLength(1);
  });

  it('فیلتر فیلد داینامیک (customFields) — چندمقداری (آرایه)', () => {
    const list = [
      makeCandidate({ customFields: { languages: ['fa', 'en'] } }),
      makeCandidate({ customFields: { languages: ['fa'] } }),
    ];
    const filters: CandidateFilterState = { ...DEFAULT_FILTERS, dynamicFilters: { languages: 'en' } };
    expect(filterCandidates(list, filters)).toHaveLength(1);
  });

  it('همه‌ی فیلترها با هم ترکیب می‌شوند (AND)', () => {
    const list = [
      makeCandidate({ status: 'shortlist', area: 'hall', firstName: 'سارا' }),
      makeCandidate({ status: 'shortlist', area: 'kitchen', firstName: 'سارا' }),
      makeCandidate({ status: 'new', area: 'hall', firstName: 'سارا' }),
    ];
    const filters: CandidateFilterState = { ...DEFAULT_FILTERS, status: 'shortlist', area: 'hall' };
    expect(filterCandidates(list, filters)).toHaveLength(1);
  });

  it('فیلتر جنسیت', () => {
    const list = [makeCandidate({ gender: 'male' }), makeCandidate({ gender: 'female' })];
    const filters: CandidateFilterState = { ...DEFAULT_FILTERS, gender: 'female' };
    expect(filterCandidates(list, filters)).toHaveLength(1);
  });

  it('فیلتر شیفت — روی آرایه‌ی shiftAvailability چک می‌کند', () => {
    const list = [
      makeCandidate({ shiftAvailability: ['morning', 'evening'] }),
      makeCandidate({ shiftAvailability: ['night'] }),
    ];
    const filters: CandidateFilterState = { ...DEFAULT_FILTERS, shift: 'evening' };
    expect(filterCandidates(list, filters)).toHaveLength(1);
  });

  it('فیلتر کانال آشنایی', () => {
    const list = [makeCandidate({ referralSource: 'instagram' }), makeCandidate({ referralSource: 'friend' })];
    const filters: CandidateFilterState = { ...DEFAULT_FILTERS, referral: 'friend' };
    expect(filterCandidates(list, filters)).toHaveLength(1);
  });

  it('فیلتر وجود رزومه', () => {
    const list = [makeCandidate({ hasResume: true }), makeCandidate({ hasResume: false })];
    expect(filterCandidates(list, { ...DEFAULT_FILTERS, hasResume: 'yes' })).toHaveLength(1);
    expect(filterCandidates(list, { ...DEFAULT_FILTERS, hasResume: 'no' })).toHaveLength(1);
  });
});

describe('sortCandidates', () => {
  it('sort=score نزولی مرتب می‌کند', () => {
    const list = [makeCandidate({ score: 2 }), makeCandidate({ score: 5 }), makeCandidate({ score: null })];
    const sorted = sortCandidates(list, 'score');
    expect(sorted.map(c => c.score)).toEqual([5, 2, null]);
  });

  it('sort=date ترتیب ورودی (سرور) را دست‌نخورده برمی‌گرداند', () => {
    const list = [makeCandidate({ id: 'a' }), makeCandidate({ id: 'b' })];
    expect(sortCandidates(list, 'date').map(c => c.id)).toEqual(['a', 'b']);
  });

  it('sortCandidates آرایه‌ی ورودی را جهش نمی‌دهد', () => {
    const list = [makeCandidate({ score: 1 }), makeCandidate({ score: 3 })];
    const original = [...list];
    sortCandidates(list, 'score');
    expect(list).toEqual(original);
  });
});

describe('statusCounts', () => {
  it('شمارش هر وضعیت را با اعمال فیلترهای غیر-status برمی‌گرداند', () => {
    const list = [
      makeCandidate({ status: 'new', area: 'hall' }),
      makeCandidate({ status: 'new', area: 'kitchen' }),
      makeCandidate({ status: 'shortlist', area: 'hall' }),
      makeCandidate({ status: 'accepted', area: 'hall' }),
    ];
    const counts = statusCounts(list, { area: 'hall', start: 'all', gender: 'all', shift: 'all', referral: 'all', hasResume: 'all', search: '', dynamicFilters: {} });
    expect(counts).toEqual({ all: 3, new: 1, shortlist: 1, accepted: 1, rejected: 0 });
  });

  it('بدون فیلتر، all برابر کل لیست است', () => {
    const list = [makeCandidate(), makeCandidate(), makeCandidate({ status: 'rejected' })];
    const counts = statusCounts(list, { area: 'all', start: 'all', gender: 'all', shift: 'all', referral: 'all', hasResume: 'all', search: '', dynamicFilters: {} });
    expect(counts.all).toBe(3);
    expect(counts.rejected).toBe(1);
  });
});

describe('countActiveFilters', () => {
  it('فیلتر پیش‌فرض صفر است', () => {
    expect(countActiveFilters(DEFAULT_FILTERS)).toBe(0);
  });

  it('هر فیلتر غیرپیش‌فرض یک واحد اضافه می‌کند', () => {
    const filters: CandidateFilterState = {
      status: 'new', area: 'hall', start: 'immediate', gender: 'female', shift: 'morning',
      referral: 'friend', hasResume: 'yes', search: 'علی', sort: 'score',
      dynamicFilters: { x: 'y' },
    };
    // status+area+start+gender+shift+referral+hasResume+search+dynamicFilters(x) = 9 — sort جزو شمارش نیست
    expect(countActiveFilters(filters)).toBe(9);
  });

  it('مقدار خالی یا all در dynamicFilters شمرده نمی‌شود', () => {
    const filters: CandidateFilterState = { ...DEFAULT_FILTERS, dynamicFilters: { x: 'all', y: '' } };
    expect(countActiveFilters(filters)).toBe(0);
  });
});

describe('filtersToParams / paramsToFilters — round-trip URL', () => {
  it('فیلتر پیش‌فرض به params خالی تبدیل می‌شود', () => {
    expect(filtersToParams(DEFAULT_FILTERS)).toEqual({});
  });

  it('round-trip یک فیلتر کامل شامل فیلد داینامیک', () => {
    const filters: CandidateFilterState = {
      status: 'shortlist', area: 'kitchen', start: 'within_week', gender: 'male', shift: 'night',
      referral: 'divar', hasResume: 'yes', search: 'رضا', sort: 'score',
      dynamicFilters: { experience_level: 'senior' },
    };
    const params = new URLSearchParams(filtersToParams(filters));
    expect(paramsToFilters(params)).toEqual(filters);
  });

  it('مقدار نامعتبر status در URL بی‌صدا به all برمی‌گردد', () => {
    const params = new URLSearchParams({ status: 'not-a-real-status' });
    expect(paramsToFilters(params).status).toBe('all');
  });

  it('پارامتر بدون پیشوند f_ به عنوان فیلتر داینامیک خوانده نمی‌شود', () => {
    const params = new URLSearchParams({ unrelated: 'x' });
    expect(paramsToFilters(params).dynamicFilters).toEqual({});
  });
});

describe('canViewPhone', () => {
  it('SuperAdmin مجاز است', () => {
    expect(canViewPhone(makeUser('SuperAdmin'))).toBe(true);
  });

  it('BranchUser مجاز نیست', () => {
    expect(canViewPhone(makeUser('BranchUser'))).toBe(false);
  });

  it('کاربر null مجاز نیست', () => {
    expect(canViewPhone(null)).toBe(false);
  });
});
