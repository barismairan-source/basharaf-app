/**
 * محدودکننده‌ها (lib/auth/rateLimit.ts) — رفع یافته‌ی B7:
 * سطل‌های عمومی از لاگین جدا هستند و IP از X-Forwarded-For قابل جعل نیست.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  consumeRequestLimit, getClientIp, checkRateLimit,
  checkEmailLoginLimit, recordEmailLoginFailure, clearEmailLoginFailures,
} from '@/lib/auth/rateLimit';

const req = (headers: Record<string, string>) => new Request('http://x/', { headers });

afterEach(() => {
  vi.useRealTimers();
  delete process.env.TRUSTED_PROXY_HOPS;
});

describe('getClientIp', () => {
  it('x-real-ip اولویت دارد', () => {
    expect(getClientIp(req({ 'x-real-ip': '5.5.5.5', 'x-forwarded-for': '1.1.1.1, 9.9.9.9' }))).toBe('5.5.5.5');
  });
  it('مقدار اولِ X-Forwarded-For (قابل جعل) استفاده نمی‌شود — آخرین hop', () => {
    expect(getClientIp(req({ 'x-forwarded-for': 'spoofed, 9.9.9.9' }))).toBe('9.9.9.9');
  });
  it('TRUSTED_PROXY_HOPS=2 → دومی از انتها', () => {
    process.env.TRUSTED_PROXY_HOPS = '2';
    expect(getClientIp(req({ 'x-forwarded-for': 'spoofed, 7.7.7.7, 10.0.0.1' }))).toBe('7.7.7.7');
  });
  it('بدون هدر → unknown', () => {
    expect(getClientIp(req({}))).toBe('unknown');
  });
});

describe('consumeRequestLimit — سطل‌های جدا', () => {
  const limit = { max: 3, windowMs: 60_000 };

  it('بعد از سقف رد می‌کند و بعد از پنجره دوباره باز می‌شود', () => {
    vi.useFakeTimers();
    for (let i = 0; i < 3; i++) expect(consumeRequestLimit('t1', '1.2.3.4', limit).allowed).toBe(true);
    const blocked = consumeRequestLimit('t1', '1.2.3.4', limit);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
    vi.advanceTimersByTime(60_001);
    expect(consumeRequestLimit('t1', '1.2.3.4', limit).allowed).toBe(true);
  });

  it('پرشدن سطل رزرو، لاگین همان IP را قفل نمی‌کند', () => {
    for (let i = 0; i < 10; i++) consumeRequestLimit('reservation-create', '8.8.8.8', limit);
    expect(consumeRequestLimit('reservation-create', '8.8.8.8', limit).allowed).toBe(false);
    expect(checkRateLimit('8.8.8.8').allowed).toBe(true);
    expect(consumeRequestLimit('other-bucket', '8.8.8.8', limit).allowed).toBe(true);
  });
});

describe('کلید مشترک (IP نامعلوم/داخلی)', () => {
  it('سقف ۱۰ برابر می‌شود تا مشتریان واقعی پشت یک IP همدیگر را قفل نکنند', () => {
    const limit = { max: 2, windowMs: 60_000 };
    for (let i = 0; i < 20; i++) expect(consumeRequestLimit('shared', 'unknown', limit).allowed).toBe(true);
    expect(consumeRequestLimit('shared', 'unknown', limit).allowed).toBe(false);
    for (let i = 0; i < 20; i++) consumeRequestLimit('shared', '10.0.0.5', limit);
    expect(consumeRequestLimit('shared', '10.0.0.5', limit).allowed).toBe(false);
    consumeRequestLimit('shared', '5.6.7.8', limit);
    consumeRequestLimit('shared', '5.6.7.8', limit);
    expect(consumeRequestLimit('shared', '5.6.7.8', limit).allowed).toBe(false);
  });
});

describe('محدودیت لاگین بر اساس ایمیل', () => {
  it('بعد از ۲۰ شکست روی یک ایمیل، حتی از IP دیگر هم رد می‌شود', () => {
    const email = 'victim@example.com';
    for (let i = 0; i < 20; i++) recordEmailLoginFailure(email);
    expect(checkEmailLoginLimit(email).allowed).toBe(false);
    expect(checkEmailLoginLimit('other@example.com').allowed).toBe(true);
    clearEmailLoginFailures(email);
    expect(checkEmailLoginLimit(email).allowed).toBe(true);
  });
});
