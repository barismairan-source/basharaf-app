import { describe, it, expect } from 'vitest';
import { resolveClockIp, normalizeIp, parseCidr, ipMatchesCidr } from '@/lib/attendance-clock/ip';
import {
  clockStateFrom, decideClock, pairToEntryFields, tehranParts, pickClosestAssignment,
  MAX_OPEN_SHIFT_HOURS,
} from '@/lib/attendance-clock/rules';

// نشانی‌های مستندسازی (RFC 5737 / RFC 3849) — هیچ IP واقعی شعبه‌ای در آزمون نیست.
const SHOP = '203.0.113.10';
const HOME = '198.51.100.7';

function h(init: Record<string, string>): Headers {
  return new Headers(init);
}

describe('resolveClockIp — IP واقعی پشت پراکسی', () => {
  it('x-real-ip تنها', () => {
    expect(resolveClockIp(h({ 'x-real-ip': SHOP }))).toMatchObject({ ok: true, ip: SHOP });
  });

  it('X-Forwarded-For: فقط مقدار سمت راست (اضافه‌شده توسط پراکسی) — سمت چپ جعل‌پذیر است', () => {
    expect(resolveClockIp(h({ 'x-forwarded-for': `${SHOP}, ${HOME}` }))).toMatchObject({ ok: true, ip: HOME });
  });

  it('پراکسی‌های داخلی (نشانی خصوصی) در انتهای X-Forwarded-For رد می‌شوند', () => {
    expect(resolveClockIp(h({ 'x-forwarded-for': `${SHOP}, 10.1.2.3` }))).toMatchObject({ ok: true, ip: SHOP });
    expect(resolveClockIp(h({ 'x-forwarded-for': `${HOME}, ${SHOP}, 10.1.2.3, 172.20.0.5` }))).toMatchObject({ ok: true, ip: SHOP });
  });

  it('هر دو سرآیند و برابر → پذیرفته', () => {
    expect(resolveClockIp(h({ 'x-real-ip': SHOP, 'x-forwarded-for': SHOP }))).toMatchObject({ ok: true, ip: SHOP });
  });

  it('جعل x-real-ip از خانه (پراکسی بازنویسی نکرده) → رد، چون با XFF نمی‌خواند', () => {
    expect(resolveClockIp(h({ 'x-real-ip': SHOP, 'x-forwarded-for': HOME }))).toMatchObject({ ok: false, reason: 'mismatch' });
  });

  it('جعل X-Forwarded-For با IP مغازه در سمت چپ → IP واقعی (راست) انتخاب می‌شود', () => {
    expect(resolveClockIp(h({ 'x-forwarded-for': `${SHOP}, ${HOME}`, 'x-real-ip': HOME }))).toMatchObject({ ok: true, ip: HOME });
  });

  it('Next.js وقتی سرآیند نیست نشانی سوکت را می‌گذارد (::1) — با x-real-ip عمومی تضاد حساب نمی‌شود', () => {
    expect(resolveClockIp(h({ 'x-real-ip': SHOP, 'x-forwarded-for': '::1' }))).toMatchObject({ ok: true, ip: SHOP });
  });

  it('فقط نشانی داخلی یا بدون سرآیند → قابل تشخیص نیست', () => {
    expect(resolveClockIp(h({ 'x-real-ip': '10.0.0.5', 'x-forwarded-for': '::1' }))).toMatchObject({ ok: false, reason: 'missing' });
    expect(resolveClockIp(h({}))).toMatchObject({ ok: false, reason: 'missing' });
  });

  it('مقدار نامعتبر → رد', () => {
    expect(resolveClockIp(h({ 'x-real-ip': 'not-an-ip' }))).toMatchObject({ ok: false, reason: 'invalid' });
    expect(resolveClockIp(h({ 'x-forwarded-for': `${SHOP}, garbage` }))).toMatchObject({ ok: false, reason: 'invalid' });
  });

  it('IPv4-mapped IPv6 با IPv4 یکی حساب می‌شود', () => {
    expect(resolveClockIp(h({ 'x-real-ip': `::ffff:${SHOP}`, 'x-forwarded-for': SHOP }))).toMatchObject({ ok: true, ip: SHOP });
  });
});

describe('normalizeIp', () => {
  it('پورت و براکت حذف می‌شوند', () => {
    expect(normalizeIp(`${SHOP}:4433`)).toBe(SHOP);
    expect(normalizeIp('[2001:DB8::1]:443')).toBe('2001:db8::1');
  });
  it('نامعتبر → null', () => {
    expect(normalizeIp('1.2.3')).toBeNull();
    expect(normalizeIp('')).toBeNull();
  });
});

describe('parseCidr — ورودی مدیر', () => {
  it('IP تنها → /32', () => {
    expect(parseCidr(SHOP)).toEqual({ ok: true, value: { ip: SHOP, prefix: 32, family: 4, canonical: SHOP } });
  });
  it('بازه‌ی کوچک پذیرفته می‌شود', () => {
    expect(parseCidr('203.0.113.8/29')).toMatchObject({ ok: true, value: { canonical: '203.0.113.8/29' } });
  });
  it('بازه‌ی خیلی بزرگ رد می‌شود', () => {
    expect(parseCidr('203.0.0.0/16').ok).toBe(false);
  });
  it('IP خصوصی/داخلی مودم رد می‌شود', () => {
    for (const ip of ['192.168.1.1', '10.0.0.1', '172.16.5.5', '100.64.1.1', '127.0.0.1']) {
      expect(parseCidr(ip).ok).toBe(false);
    }
  });
  it('IPv6', () => {
    expect(parseCidr('2001:db8:1234::/48')).toMatchObject({ ok: true, value: { family: 6, prefix: 48 } });
    expect(parseCidr('2001:db8::/32').ok).toBe(false);
    expect(parseCidr('fe80::1').ok).toBe(false);
  });
  it('ارقام فارسی/عربی و نقطه‌ی فارسی پذیرفته می‌شوند', () => {
    expect(parseCidr('۲۰۳.۰.۱۱۳.۱۰')).toMatchObject({ ok: true, value: { canonical: SHOP } });
    expect(parseCidr('٢٠٣٫٠٫١١٣٫١٠')).toMatchObject({ ok: true, value: { canonical: SHOP } });
  });
  it('قالب غلط', () => {
    expect(parseCidr('203.0.113.1/abc').ok).toBe(false);
    expect(parseCidr('203.0.113.1/33').ok).toBe(false);
    expect(parseCidr('a/b/c').ok).toBe(false);
  });
});

describe('ipMatchesCidr', () => {
  it('تطابق دقیق و بازه', () => {
    expect(ipMatchesCidr(SHOP, SHOP)).toBe(true);
    expect(ipMatchesCidr('203.0.113.13', '203.0.113.8/29')).toBe(true);
    expect(ipMatchesCidr('203.0.113.16', '203.0.113.8/29')).toBe(false);
    expect(ipMatchesCidr(HOME, SHOP)).toBe(false);
  });
  it('خانواده‌ی متفاوت هرگز تطابق ندارد', () => {
    expect(ipMatchesCidr('2001:db8::1', SHOP)).toBe(false);
  });
  it('IPv6', () => {
    expect(ipMatchesCidr('2001:db8:1234:5::9', '2001:db8:1234::/48')).toBe(true);
    expect(ipMatchesCidr('2001:db8:9999::1', '2001:db8:1234::/48')).toBe(false);
  });
});

describe('ترتیب ورود/خروج', () => {
  const t0 = new Date('2026-10-20T05:30:00Z'); // ۰۹:۰۰ تهران
  const later = (min: number) => new Date(t0.getTime() + min * 60_000);

  it('بدون ورود باز → فقط ورود مجاز', () => {
    const s = clockStateFrom(null, t0);
    expect(decideClock('clock_in', s, t0)).toEqual({ ok: true, action: 'clock_in' });
    expect(decideClock('clock_out', s, t0)).toMatchObject({ ok: false, code: 'NOT_IN' });
  });

  it('ورود باز → ورود دوباره رد، خروج مجاز و جفت می‌شود', () => {
    const s = clockStateFrom({ id: 'in-1', occurredAt: t0 }, later(480));
    expect(decideClock('clock_in', s, later(480))).toMatchObject({ ok: false, code: 'ALREADY_IN' });
    expect(decideClock('clock_out', s, later(480))).toMatchObject({ ok: true, action: 'clock_out', pairedInEventId: 'in-1' });
  });

  it('خروج کمتر از یک دقیقه بعد از ورود → رد', () => {
    const now = new Date(t0.getTime() + 20_000);
    const s = clockStateFrom({ id: 'in-1', occurredAt: t0 }, now);
    expect(decideClock('clock_out', s, now)).toMatchObject({ ok: false, code: 'TOO_SOON' });
  });

  it('ورود فراموش‌شده‌ی قدیمی → ناقص؛ ورود جدید مجاز، خروج روی آن رد', () => {
    const now = later(MAX_OPEN_SHIFT_HOURS * 60 + 1);
    const s = clockStateFrom({ id: 'old', occurredAt: t0 }, now);
    expect(s.kind).toBe('stale');
    expect(decideClock('clock_in', s, now)).toMatchObject({ ok: true });
    expect(decideClock('clock_out', s, now)).toMatchObject({ ok: false, code: 'NOT_IN' });
  });
});

describe('زمان تهران و تبدیل به حضور', () => {
  it('ساعت و تاریخ به‌وقت تهران، مستقل از timezone سرور', () => {
    expect(tehranParts(new Date('2026-10-20T05:30:00Z'))).toEqual({ date: '2026-10-20', hhmm: '09:00' });
    // ۲۲:۰۰ UTC = ۰۱:۳۰ روز بعد در تهران
    expect(tehranParts(new Date('2026-10-20T22:00:00Z'))).toEqual({ date: '2026-10-21', hhmm: '01:30' });
    // نیمه‌شب تهران «00» است نه «24»
    expect(tehranParts(new Date('2026-10-20T20:30:00Z')).hhmm).toBe('00:00');
  });

  it('شیفت عادی', () => {
    expect(pairToEntryFields(new Date('2026-10-20T05:30:00Z'), new Date('2026-10-20T13:45:59Z')))
      .toEqual({ workDate: '2026-10-20', clockIn: '09:00', clockOut: '17:15', crossesMidnight: false });
  });

  it('شیفت شب که از نیمه‌شب می‌گذرد به روز ورود تعلق دارد', () => {
    expect(pairToEntryFields(new Date('2026-10-20T15:30:00Z'), new Date('2026-10-20T21:00:00Z')))
      .toEqual({ workDate: '2026-10-20', clockIn: '19:00', clockOut: '00:30', crossesMidnight: true });
  });

  it('نزدیک‌ترین شیفت برنامه‌ریزی‌شده انتخاب می‌شود', () => {
    const a = [{ id: 'm', plannedStartTime: '08:00' }, { id: 'e', plannedStartTime: '17:00' }];
    expect(pickClosestAssignment(a, '08:20')?.id).toBe('m');
    expect(pickClosestAssignment(a, '16:40')?.id).toBe('e');
    expect(pickClosestAssignment([], '08:00')).toBeNull();
    // ۲۳:۵۰ به شیفت ۰۰:۱۰ نزدیک‌تر است تا ۱۸:۰۰
    expect(pickClosestAssignment([{ id: 'n', plannedStartTime: '00:10' }, { id: 'x', plannedStartTime: '18:00' }], '23:50')?.id).toBe('n');
  });
});
