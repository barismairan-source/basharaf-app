/**
 * رزومه‌ی فرم عمومی `/apply` — BA-07 (ممیزی ۲۰۲۶-۱۰-۳۰).
 * قبلاً `resumeUrl` هر رشته‌ای بود؛ route رزومه‌ی ادمین به آن redirect می‌کرد و
 * دانلود ZIP آن را سمت سرور fetch می‌کرد.
 */
import { describe, it, expect } from 'vitest';
import {
  isAllowedResumeDataUri, safeResumeMimeType, isTrustedResumeUrl,
} from '@/lib/recruitment/resumeUrl';
import { applicationCreateSchema } from '@/lib/validations/recruitment';

const pdf = 'data:application/pdf;base64,JVBERi0xLjQK';

describe('isAllowedResumeDataUri', () => {
  it.each([
    pdf,
    'data:image/jpeg;base64,/9j/4AAQ',
    'data:image/png;base64,iVBORw0KGgo=',
    'data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,UEsDBA==',
    'data:;base64,AAAA', // مرورگر نوع را نشناخت → octet-stream
  ])('می‌پذیرد: %s', (v) => expect(isAllowedResumeDataUri(v)).toBe(true));

  it.each([
    'https://evil.example/x.pdf',
    'http://169.254.169.254/latest/meta-data/',
    'javascript:alert(1)',
    'data:text/html;base64,PHNjcmlwdD4=',
    'data:image/svg+xml;base64,PHN2Zz4=',
    'data:application/pdf,%PDF-plain', // بدون base64
    'data:application/pdf;base64,not base64!',
  ])('رد می‌کند: %s', (v) => expect(isAllowedResumeDataUri(v)).toBe(false));
});

describe('safeResumeMimeType', () => {
  it('نوع مجاز حفظ می‌شود', () => expect(safeResumeMimeType('application/pdf')).toBe('application/pdf'));
  it('نوع خطرناک → octet-stream', () => expect(safeResumeMimeType('text/html')).toBe('application/octet-stream'));
  it('خالی → octet-stream', () => expect(safeResumeMimeType(undefined)).toBe('application/octet-stream'));
});

describe('isTrustedResumeUrl', () => {
  const env = { SUPABASE_URL: 'https://abcd.supabase.co' } as unknown as NodeJS.ProcessEnv;
  it('https روی میزبان Supabase پروژه', () =>
    expect(isTrustedResumeUrl('https://abcd.supabase.co/storage/v1/object/r.pdf', env)).toBe(true));
  it.each([
    'https://evil.example/r.pdf',
    'http://abcd.supabase.co/r.pdf',
    'https://abcd.supabase.co.evil.example/r.pdf',
    'http://127.0.0.1:5432/',
    'not a url',
  ])('رد: %s', (v) => expect(isTrustedResumeUrl(v, env)).toBe(false));
  it('بدون تنظیم Supabase هیچ URL مجاز نیست', () =>
    expect(isTrustedResumeUrl('https://abcd.supabase.co/r.pdf', {} as unknown as NodeJS.ProcessEnv)).toBe(false));
});

describe('applicationCreateSchema.resumeUrl', () => {
  const base = {
    firstName: 'علی', lastName: 'رضایی', phone: '09123456789', city: 'تهران',
    area: 'hall' as const, shiftAvailability: ['morning'],
  };
  it('data URI مجاز → معتبر', () =>
    expect(applicationCreateSchema.safeParse({ ...base, hasResume: true, resumeUrl: pdf }).success).toBe(true));
  it('URL خارجی → نامعتبر', () =>
    expect(applicationCreateSchema.safeParse({ ...base, hasResume: true, resumeUrl: 'https://evil.example/x' }).success).toBe(false));
  it('بدون رزومه → معتبر', () =>
    expect(applicationCreateSchema.safeParse({ ...base, resumeUrl: null }).success).toBe(true));
});
