import { describe, it, expect } from 'vitest';
import { normalizeSearchText, searchTokens, phoneDigitsQuery, SEARCH_TRANSLATE_FROM, SEARCH_TRANSLATE_TO } from '@/lib/recruitment/searchNormalize';
import { DEFAULT_FILTERS, filterCandidates } from '@/lib/recruitment/filterCandidates';
import type { JobApplication } from '@/lib/recruitment/questions';

function cand(firstName: string, lastName: string, phone: string): JobApplication {
  return {
    id: `${firstName}-${phone}`, firstName, lastName, phone, age: null, gender: null, city: null,
    hasResume: false, resumePath: null, manualInfo: null, answers: {}, area: null, shiftAvailability: null,
    startAvailability: null, referralSource: null, status: 'new', score: null, reviewerNote: null,
    customFields: {}, fieldSnapshot: [], hiredAt: null, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  };
}

describe('searchNormalize', () => {
  it('جدول translate برای SQL هم‌طول است', () => {
    expect(Array.from(SEARCH_TRANSLATE_FROM).length).toBe(Array.from(SEARCH_TRANSLATE_TO).length);
  });
  it('ارقام فارسی/عربی و ی/ک عربی یکسان می‌شوند', () => {
    expect(normalizeSearchText('۰۹۱۲')).toBe('0912');
    expect(normalizeSearchText('٠٩١٢')).toBe('0912');
    expect(normalizeSearchText('علي كريمي')).toBe('علی کریمی');
    expect(normalizeSearchText('  Ali   KARIMI ')).toBe('ali karimi');
    expect(normalizeSearchText('می‌خواهم')).toBe('می خواهم');
  });
  it('کلمه‌ها جدا می‌شوند', () => {
    expect(searchTokens('علی  کریمی')).toEqual(['علی', 'کریمی']);
  });
  it('جستجوی شماره: پیشوند ۰/۹۸/۰۰۹۸ حذف و فاصله نادیده گرفته می‌شود', () => {
    expect(phoneDigitsQuery('۰۹۱۲ ۳۴۵')).toBe('912345');
    expect(phoneDigitsQuery('+98 912 345')).toBe('912345');
    expect(phoneDigitsQuery('00989123')).toBe('9123');
    expect(phoneDigitsQuery('علی')).toBeNull();
    expect(phoneDigitsQuery('09')).toBeNull();
  });
});

describe('filterCandidates — جستجوی یکسان‌شده', () => {
  const list = [cand('علی', 'کریمی', '09121234567'), cand('سارا', 'یوسفی', '09350000000')];
  const search = (q: string) => filterCandidates(list, { ...DEFAULT_FILTERS, search: q }).map((a) => a.firstName);
  it('ی/ک عربی نام فارسی را پیدا می‌کند', () => {
    expect(search('علي')).toEqual(['علی']);
    expect(search('كريمي')).toEqual(['علی']);
  });
  it('ارقام فارسی و قالب‌های مختلف شماره', () => {
    expect(search('۰۹۱۲۱۲۳')).toEqual(['علی']);
    expect(search('+98 912 123')).toEqual(['علی']);
  });
  it('چند کلمه: همه باید پیدا شوند', () => {
    expect(search('سارا یوسفی')).toEqual(['سارا']);
    expect(search('سارا کریمی')).toEqual([]);
  });
});
