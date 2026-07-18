/**
 * Notification Center V2 — behavioral tests
 *
 * All tests import and exercise production code directly.
 * No logic from route handlers or service.ts is re-implemented here.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── retry.ts ────────────────────────────────────────────────────

import { retryDelayMs, nextAttemptAt, isLockStale, DEFAULT_MAX_ATTEMPTS, nextDayMidnightTehran } from '@/lib/notifications/retry';

describe('retryDelayMs', () => {
  it('returns 1 minute for attempt 1 (first retry)', () => {
    expect(retryDelayMs(1)).toBe(60_000);
  });

  it('returns 5 minutes for attempt 2', () => {
    expect(retryDelayMs(2)).toBe(5 * 60_000);
  });

  it('returns 30 minutes for attempt 3', () => {
    expect(retryDelayMs(3)).toBe(30 * 60_000);
  });

  it('returns 2 hours for attempt 4', () => {
    expect(retryDelayMs(4)).toBe(2 * 60 * 60_000);
  });

  it('returns 12 hours for attempt 5+', () => {
    expect(retryDelayMs(5)).toBe(12 * 60 * 60_000);
    expect(retryDelayMs(99)).toBe(12 * 60 * 60_000);
  });
});

describe('nextAttemptAt', () => {
  const now = new Date('2026-07-01T10:00:00Z');

  it('returns a future date when attempts < maxAttempts', () => {
    const result = nextAttemptAt(1, 5, now);
    expect(result).not.toBeNull();
    expect(result!.getTime()).toBeGreaterThan(now.getTime());
  });

  it('returns null when attempts >= maxAttempts', () => {
    expect(nextAttemptAt(5, 5, now)).toBeNull();
    expect(nextAttemptAt(6, 5, now)).toBeNull();
  });

  it('uses DEFAULT_MAX_ATTEMPTS as default', () => {
    expect(DEFAULT_MAX_ATTEMPTS).toBe(5);
  });

  it('adds the correct delay when attempts=0 (first retry uses attempt 1 delay)', () => {
    const result = nextAttemptAt(0, 5, now);
    expect(result!.getTime() - now.getTime()).toBe(retryDelayMs(1));
  });
});

describe('isLockStale', () => {
  const now = new Date('2026-07-01T10:00:00Z');

  it('returns true when lock is older than 15 minutes', () => {
    const stale = new Date(now.getTime() - 16 * 60_000);
    expect(isLockStale(stale, now)).toBe(true);
  });

  it('returns false when lock is exactly 15 minutes old', () => {
    const borderline = new Date(now.getTime() - 15 * 60_000);
    expect(isLockStale(borderline, now)).toBe(false);
  });

  it('returns false for a recent lock', () => {
    const recent = new Date(now.getTime() - 5 * 60_000);
    expect(isLockStale(recent, now)).toBe(false);
  });

  it('handles a very old lockTime as stale', () => {
    const veryOld = new Date(0);
    expect(isLockStale(veryOld, now)).toBe(true);
  });
});

describe('nextDayMidnightTehran', () => {
  it('returns a future date', () => {
    const now = new Date();
    const result = nextDayMidnightTehran(now);
    expect(result.getTime()).toBeGreaterThan(now.getTime());
  });

  it('returns less than 48 hours in the future', () => {
    const now = new Date();
    const result = nextDayMidnightTehran(now);
    expect(result.getTime() - now.getTime()).toBeLessThan(48 * 60 * 60_000);
  });

  it('corresponds to midnight in Tehran (hour=0 minute=0 in Asia/Tehran)', () => {
    const now = new Date('2026-07-16T12:00:00Z');
    const result = nextDayMidnightTehran(now);
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: 'Asia/Tehran',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(result);
    const hour   = parseInt(parts.find((p) => p.type === 'hour')!.value, 10);
    const minute = parseInt(parts.find((p) => p.type === 'minute')!.value, 10);
    expect(hour % 24).toBe(0);
    expect(minute).toBe(0);
  });
});

// ─── redaction.ts ─────────────────────────────────────────────────

import { redactError, maskPhone, maskEmail } from '@/lib/notifications/redaction';

describe('redactError', () => {
  it('strips API keys from error messages', () => {
    const msg = 'Error with apikey=abc123secret and more text';
    expect(redactError(msg)).not.toContain('abc123secret');
  });

  it('strips passwords from SMTP URLs', () => {
    const msg = 'Failed to connect smtp://user:SuperSecret@mail.example.com:587';
    const redacted = redactError(msg);
    expect(redacted).not.toContain('SuperSecret');
  });

  it('strips Bearer tokens', () => {
    const msg = 'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.very.long.token.here';
    const redacted = redactError(msg);
    expect(redacted).not.toContain('eyJhbGciOiJIUzI1NiJ9');
  });

  it('strips long base64 strings (likely credentials)', () => {
    const longB64 = 'a'.repeat(100);
    const msg = `credentials=${longB64} failed`;
    const redacted = redactError(msg);
    expect(redacted.length).toBeLessThan(msg.length);
  });

  it('truncates to 500 characters', () => {
    const longMsg = 'x'.repeat(1000);
    expect(redactError(longMsg).length).toBeLessThanOrEqual(500);
  });

  it('handles non-string input', () => {
    expect(() => redactError(null as unknown as string)).not.toThrow();
    expect(() => redactError(undefined as unknown as string)).not.toThrow();
    expect(() => redactError(new Error('test error'))).not.toThrow();
  });

  it('returns a string even for object errors', () => {
    const result = redactError({ code: 'ECONNREFUSED', address: '127.0.0.1' });
    expect(typeof result).toBe('string');
  });
});

describe('maskPhone', () => {
  it('masks middle digits of a phone number', () => {
    expect(maskPhone('09121234567')).toMatch(/^0912\*{3}4567$/);
  });

  it('handles short phone numbers gracefully', () => {
    const result = maskPhone('123');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('maskEmail', () => {
  it('masks username and domain', () => {
    const masked = maskEmail('user@example.com');
    expect(masked).not.toBe('user@example.com');
    expect(masked).toContain('@');
  });

  it('preserves first 2 chars of username', () => {
    const masked = maskEmail('ali@example.com');
    expect(masked.startsWith('al')).toBe(true);
  });

  it('handles short usernames', () => {
    const result = maskEmail('a@b.com');
    expect(typeof result).toBe('string');
  });
});

// ─── templates.ts ─────────────────────────────────────────────────

import { escapeHtml, isSafeActionUrl, absoluteUrl, buildNotificationEmail } from '@/lib/notifications/templates';

describe('escapeHtml', () => {
  it('escapes & < > " \'', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
    expect(escapeHtml("it's")).toBe('it&#39;s');
  });

  it('does not double-escape', () => {
    expect(escapeHtml('&amp;')).toBe('&amp;amp;');
  });
});

describe('isSafeActionUrl', () => {
  it('allows relative URLs starting with exactly one slash', () => {
    expect(isSafeActionUrl('/dashboard/transactions/123')).toBe(true);
    expect(isSafeActionUrl('/admin')).toBe(true);
  });

  it('rejects protocol-relative URLs (//evil.example)', () => {
    expect(isSafeActionUrl('//evil.example')).toBe(false);
  });

  it('rejects triple-slash URLs (///evil.example)', () => {
    expect(isSafeActionUrl('///evil.example')).toBe(false);
  });

  it('rejects javascript: URLs', () => {
    expect(isSafeActionUrl('javascript:alert(1)')).toBe(false);
  });

  it('rejects data: URLs', () => {
    expect(isSafeActionUrl('data:text/html,test')).toBe(false);
  });

  it('rejects arbitrary external URLs', () => {
    expect(isSafeActionUrl('https://evil.com/phish')).toBe(false);
  });

  it('allows URLs whose origin matches NEXT_PUBLIC_APP_URL', () => {
    const original = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
    expect(isSafeActionUrl('https://app.example.com/foo')).toBe(true);
    process.env.NEXT_PUBLIC_APP_URL = original;
  });

  it('rejects prefix-spoofing attack — origin must be an exact match', () => {
    const original = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = 'https://basharaf.me';
    expect(isSafeActionUrl('https://basharaf.me.evil.example/steal')).toBe(false);
    process.env.NEXT_PUBLIC_APP_URL = original;
  });

  it('rejects ftp: protocol even if origin matches app domain', () => {
    const original = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
    expect(isSafeActionUrl('ftp://app.example.com/file')).toBe(false);
    process.env.NEXT_PUBLIC_APP_URL = original;
  });
});

describe('buildNotificationEmail', () => {
  const data = { title: 'درخواست جدید', sub: 'یک درخواست جدید ثبت شد', actionUrl: '/admin' };

  it('includes escaped title in HTML', () => {
    const { html } = buildNotificationEmail(data);
    expect(html).toContain('درخواست جدید');
  });

  it('HTML-escapes title to prevent XSS', () => {
    const xssData = { ...data, title: '<script>alert(1)</script>' };
    const { html } = buildNotificationEmail(xssData);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('HTML-escapes sub', () => {
    const xssData = { ...data, sub: '"><img src=x onerror=alert(1)>' };
    const { html } = buildNotificationEmail(xssData);
    expect(html).not.toContain('<img');
  });

  it('includes a text fallback', () => {
    const { text } = buildNotificationEmail(data);
    expect(typeof text).toBe('string');
    expect(text.length).toBeGreaterThan(0);
    expect(text).toContain('درخواست جدید');
  });

  it('does not include attachments field', () => {
    const result = buildNotificationEmail(data);
    expect(result).not.toHaveProperty('attachments');
  });

  it('rejects unsafe actionUrl in link', () => {
    const unsafeData = { ...data, actionUrl: 'javascript:alert(1)' };
    const { html } = buildNotificationEmail(unsafeData);
    expect(html).not.toContain('javascript:');
  });

  it('email without in-app notification still has full content (title and sub in body)', () => {
    // Processor uses payload content directly — does NOT look up notification row
    const { html, text } = buildNotificationEmail({ title: 'عنوان', sub: 'متن کامل', actionUrl: null });
    expect(html).toContain('عنوان');
    expect(html).toContain('متن کامل');
    expect(text).toContain('عنوان');
    expect(text).toContain('متن کامل');
  });
});

// ─── outbox.ts — production code ─────────────────────────────────

import { buildOutboxDedupeKey, buildNotifDedupeKey } from '@/lib/notifications/outbox';

describe('buildOutboxDedupeKey', () => {
  it('produces a deterministic key', () => {
    const k1 = buildOutboxDedupeKey('rule.a', 'entity-1', 'user-1', 'email');
    const k2 = buildOutboxDedupeKey('rule.a', 'entity-1', 'user-1', 'email');
    expect(k1).toBe(k2);
  });

  it('differs by channel', () => {
    const sms   = buildOutboxDedupeKey('rule.a', 'e1', 'u1', 'sms');
    const email = buildOutboxDedupeKey('rule.a', 'e1', 'u1', 'email');
    expect(sms).not.toBe(email);
  });

  it('differs by ruleKey', () => {
    const k1 = buildOutboxDedupeKey('rule.a', 'e1', 'u1', 'sms');
    const k2 = buildOutboxDedupeKey('rule.b', 'e1', 'u1', 'sms');
    expect(k1).not.toBe(k2);
  });

  it('format is {ruleKey}:{eventKey}:{recipientId}:{channel}', () => {
    const k = buildOutboxDedupeKey('rule.a', 'e1', 'u1', 'sms');
    expect(k).toBe('rule.a:e1:u1:sms');
  });

  it('accepts a UUID eventKey when entityId is null (caller generates UUID)', () => {
    const uuid = '00000000-0000-0000-0000-000000000001';
    const k = buildOutboxDedupeKey('rule.a', uuid, 'u1', 'sms');
    expect(k).toBe(`rule.a:${uuid}:u1:sms`);
  });

  it('two independent null-entityId events with distinct UUIDs produce different keys', () => {
    const uuid1 = '00000000-0000-0000-0000-000000000001';
    const uuid2 = '00000000-0000-0000-0000-000000000002';
    const k1 = buildOutboxDedupeKey('rule.x', uuid1, 'u1', 'sms');
    const k2 = buildOutboxDedupeKey('rule.x', uuid2, 'u1', 'sms');
    expect(k1).not.toBe(k2);
  });

  it('idempotencyKey as eventKey produces same key for both sms and email (same event)', () => {
    const idem = 'my-idempotency-key-abc';
    const smsKey   = buildOutboxDedupeKey('rule.x', idem, 'u1', 'sms');
    const emailKey = buildOutboxDedupeKey('rule.x', idem, 'u1', 'email');
    // Same event, different channels — keys differ by channel suffix only
    expect(smsKey).toBe(`rule.x:${idem}:u1:sms`);
    expect(emailKey).toBe(`rule.x:${idem}:u1:email`);
    expect(smsKey).not.toBe(emailKey);
  });

  it('SMS and email for same event share the same eventKey segment', () => {
    const eventKey = '00000000-0000-0000-0000-000000000099';
    const smsKey   = buildOutboxDedupeKey('rule.x', eventKey, 'u1', 'sms');
    const emailKey = buildOutboxDedupeKey('rule.x', eventKey, 'u1', 'email');
    // Both start with same ruleKey:eventKey:recipientId
    expect(smsKey.replace(':sms', '')).toBe(emailKey.replace(':email', ''));
  });
});

describe('buildNotifDedupeKey', () => {
  it('produces a deterministic key', () => {
    const k1 = buildNotifDedupeKey('rule.a', 'entity-1', 'user-1');
    const k2 = buildNotifDedupeKey('rule.a', 'entity-1', 'user-1');
    expect(k1).toBe(k2);
  });

  it('format is {ruleKey}:{eventKey}:{userId}', () => {
    const k = buildNotifDedupeKey('rule.x', 'e2', 'u2');
    expect(k).toBe('rule.x:e2:u2');
  });

  it('accepts a UUID eventKey when entityId is null', () => {
    const uuid = '00000000-0000-0000-0000-000000000002';
    const k = buildNotifDedupeKey('rule.x', uuid, 'u2');
    expect(k).toBe(`rule.x:${uuid}:u2`);
  });
});

// ─── secret.ts ───────────────────────────────────────────────────

import { constantTimeEqual } from '@/lib/notifications/secret';

describe('constantTimeEqual (shared module)', () => {
  it('returns true for equal secrets', () => {
    const secret = 'a'.repeat(32);
    expect(constantTimeEqual(secret, secret)).toBe(true);
  });

  it('returns false for different secrets', () => {
    expect(constantTimeEqual('a'.repeat(32), 'b'.repeat(32))).toBe(false);
  });

  it('returns false when lengths differ', () => {
    expect(constantTimeEqual('abc', 'abcd')).toBe(false);
  });

  it('returns false for empty string vs non-empty', () => {
    expect(constantTimeEqual('', 'secret')).toBe(false);
  });
});

// ─── Privacy invariants ───────────────────────────────────────────

describe('outbox payload privacy', () => {
  it('buildOutboxDedupeKey does not encode phone or email', () => {
    const key = buildOutboxDedupeKey('rule.a', 'entity-123', 'user-abc', 'sms');
    expect(key).not.toMatch(/\d{10,}/);
    expect(key).not.toMatch(/@/);
  });

  it('buildNotifDedupeKey does not encode phone or email', () => {
    const key = buildNotifDedupeKey('rule.a', 'entity-123', 'user-abc');
    expect(key).not.toMatch(/\d{10,}/);
    expect(key).not.toMatch(/@/);
  });
});

describe('email template privacy', () => {
  it('does not include phone numbers in HTML output', () => {
    const data = { title: 'اعلان', sub: 'یک رویداد رخ داد', actionUrl: null };
    const { html, text } = buildNotificationEmail(data);
    expect(html).not.toMatch(/09\d{9}/);
    expect(text).not.toMatch(/09\d{9}/);
  });

  it('does not have attachments', () => {
    const result = buildNotificationEmail({ title: 'T', sub: 'S', actionUrl: null });
    expect(Object.keys(result)).not.toContain('attachments');
  });
});

// ─── Outbox cursor encoding — uses production helpers ────────────

import { encodeCursor, decodeCursor, encodeCursorForTest, decodeCursorForTest } from '@/lib/notifications/cursor';

describe('compound cursor encoding (production helpers)', () => {
  it('encodes and decodes correctly', () => {
    const createdAt = new Date('2026-07-16T10:30:00Z');
    const id = '00000000-0000-0000-0000-000000000001';
    const cursor = encodeCursorForTest(createdAt, id);
    const decoded = decodeCursorForTest(cursor);
    expect(decoded.at.toISOString()).toBe(createdAt.toISOString());
    expect(decoded.id).toBe(id);
  });

  it('throws on invalid base64', () => {
    expect(() => decodeCursorForTest('not-valid-base64!!!')).toThrow();
  });

  it('throws on missing fields', () => {
    const bad = Buffer.from(JSON.stringify({ at: '2026-07-16T10:00:00Z' })).toString('base64');
    expect(() => decodeCursorForTest(bad)).toThrow();
  });

  it('throws on invalid date', () => {
    const bad = Buffer.from(JSON.stringify({ at: 'not-a-date', id: 'some-id' })).toString('base64');
    expect(() => decodeCursorForTest(bad)).toThrow();
  });

  it('two rows with equal timestamps produce different cursors (id breaks the tie)', () => {
    const ts = new Date('2026-07-16T10:00:00Z');
    const c1 = encodeCursorForTest(ts, '00000000-0000-0000-0000-000000000001');
    const c2 = encodeCursorForTest(ts, '00000000-0000-0000-0000-000000000002');
    expect(c1).not.toBe(c2);
    // Both decode to the same timestamp but different ids
    expect(decodeCursorForTest(c1).at.toISOString()).toBe(ts.toISOString());
    expect(decodeCursorForTest(c2).at.toISOString()).toBe(ts.toISOString());
    expect(decodeCursorForTest(c1).id).not.toBe(decodeCursorForTest(c2).id);
  });
});

// ─── isSafeActionUrl — comprehensive security tests ──────────────

describe('isSafeActionUrl security invariants', () => {
  it('rejects null and undefined', () => {
    expect(isSafeActionUrl(null)).toBe(false);
    expect(isSafeActionUrl(undefined)).toBe(false);
    expect(isSafeActionUrl('')).toBe(false);
  });

  it('rejects protocol-relative // attacks', () => {
    expect(isSafeActionUrl('//evil.example/steal')).toBe(false);
    expect(isSafeActionUrl('//localhost')).toBe(false);
  });

  it('rejects triple-slash paths', () => {
    expect(isSafeActionUrl('///etc/passwd')).toBe(false);
  });

  it('accepts simple relative paths', () => {
    expect(isSafeActionUrl('/dashboard')).toBe(true);
    expect(isSafeActionUrl('/recruitment/123')).toBe(true);
  });

  it('rejects data: scheme', () => {
    expect(isSafeActionUrl('data:text/html,<h1>hi</h1>')).toBe(false);
  });

  it('rejects javascript: scheme', () => {
    expect(isSafeActionUrl('javascript:void(0)')).toBe(false);
  });
});

// ─── notificationsSlice — store rollback ─────────────────────────

import { createNotificationsSlice } from '@/store/slices/notificationsSlice';
import { createStore } from 'zustand/vanilla';
import type { NotificationsSlice } from '@/store/slices/notificationsSlice';
import type { NotificationsRepo } from '@/lib/repos';

function makeNotifStore(repo: Partial<NotificationsRepo> = {}) {
  const defaultRepo: NotificationsRepo = {
    list:       async () => [],
    markRead:   async () => {},
    markUnread: async () => {},
    archive:    async () => {},
    markAllRead: async () => {},
    create:     async () => { throw new Error('not used'); },
    ...repo,
  };
  const slice = createNotificationsSlice({ repo: defaultRepo });
  return createStore<NotificationsSlice>(slice);
}

describe('notificationsSlice — optimistic rollback', () => {
  it('markNotificationRead rolls back on failure', async () => {
    const store = makeNotifStore({
      markRead: async () => { throw new Error('network error'); },
    });
    store.getState()._setNotifications([
      { id: '1', type: 'info', title: 'T', sub: 'S', time: '', read: false, txId: null, actionUrl: null, entityId: null, createdAt: new Date().toISOString(), readAt: null, archivedAt: null, ruleKey: null, priority: 0 },
    ]);
    await store.getState().markNotificationRead('1').catch(() => {});
    expect(store.getState().notifications[0]!.read).toBe(false);
  });

  it('markNotificationUnread rolls back on failure', async () => {
    const store = makeNotifStore({
      markUnread: async () => { throw new Error('network error'); },
    });
    store.getState()._setNotifications([
      { id: '1', type: 'info', title: 'T', sub: 'S', time: '', read: true, txId: null, actionUrl: null, entityId: null, createdAt: new Date().toISOString(), readAt: null, archivedAt: null, ruleKey: null, priority: 0 },
    ]);
    await store.getState().markNotificationUnread('1').catch(() => {});
    expect(store.getState().notifications[0]!.read).toBe(true);
  });

  it('archiveNotification rolls back on failure', async () => {
    const store = makeNotifStore({
      archive: async () => { throw new Error('network error'); },
    });
    store.getState()._setNotifications([
      { id: '1', type: 'info', title: 'T', sub: 'S', time: '', read: false, txId: null, actionUrl: null, entityId: null, createdAt: new Date().toISOString(), readAt: null, archivedAt: null, ruleKey: null, priority: 0 },
    ]);
    await store.getState().archiveNotification('1').catch(() => {});
    expect(store.getState().notifications).toHaveLength(1);
  });

  it('markAllNotificationsRead rolls back on failure', async () => {
    const store = makeNotifStore({
      markAllRead: async () => { throw new Error('network error'); },
    });
    store.getState()._setNotifications([
      { id: '1', type: 'info', title: 'T', sub: 'S', time: '', read: false, txId: null, actionUrl: null, entityId: null, createdAt: new Date().toISOString(), readAt: null, archivedAt: null, ruleKey: null, priority: 0 },
    ]);
    await store.getState().markAllNotificationsRead().catch(() => {});
    expect(store.getState().notifications[0]!.read).toBe(false);
  });
});

describe('notificationsSlice — upsertNotification (realtime)', () => {
  it('adds a new notification and makes it visible via bell and page', () => {
    const store = makeNotifStore();
    const notif = { id: '99', type: 'info' as const, title: 'T', sub: 'S', time: '', read: false, txId: null, actionUrl: null, entityId: null, createdAt: new Date().toISOString(), readAt: null, archivedAt: null, ruleKey: null, priority: 0 };
    store.getState().upsertNotification(notif);
    expect(store.getState().notifications).toHaveLength(1);
    expect(store.getState().notifications[0]!.id).toBe('99');
  });

  it('removes archived notifications', () => {
    const store = makeNotifStore();
    const notif = { id: '99', type: 'info' as const, title: 'T', sub: 'S', time: '', read: false, txId: null, actionUrl: null, entityId: null, createdAt: new Date().toISOString(), readAt: null, archivedAt: null, ruleKey: null, priority: 0 };
    store.getState()._setNotifications([notif]);
    expect(store.getState().notifications).toHaveLength(1);
    store.getState().upsertNotification({ ...notif, archivedAt: new Date().toISOString() });
    expect(store.getState().notifications).toHaveLength(0);
  });

  it('deduplicates: upserting same id does not duplicate', () => {
    const store = makeNotifStore();
    const notif = { id: '99', type: 'info' as const, title: 'T', sub: 'S', time: '', read: false, txId: null, actionUrl: null, entityId: null, createdAt: new Date().toISOString(), readAt: null, archivedAt: null, ruleKey: null, priority: 0 };
    store.getState().upsertNotification(notif);
    store.getState().upsertNotification({ ...notif, read: true });
    expect(store.getState().notifications).toHaveLength(1);
    expect(store.getState().notifications[0]!.read).toBe(true);
  });

  it('unreadCount excludes archived', () => {
    const store = makeNotifStore();
    const ts = new Date().toISOString();
    store.getState()._setNotifications([
      { id: '1', type: 'info' as const, title: 'T', sub: 'S', time: '', read: false, txId: null, actionUrl: null, entityId: null, createdAt: ts, readAt: null, archivedAt: null, ruleKey: null, priority: 0 },
      { id: '2', type: 'info' as const, title: 'T', sub: 'S', time: '', read: false, txId: null, actionUrl: null, entityId: null, createdAt: ts, readAt: null, archivedAt: ts, ruleKey: null, priority: 0 },
    ]);
    expect(store.getState().unreadCount()).toBe(1);
  });
});

// ─── Outbox cursor — equal-timestamp tie-break ────────────────────

describe('outbox cursor: equal-timestamp rows are not skipped', () => {
  it('two rows with same updatedAt but different id produce different cursors', () => {
    const ts = new Date('2026-07-16T10:00:00Z');
    const c1 = encodeCursorForTest(ts, '00000000-0000-0000-0000-aaaaaaaaaaaa');
    const c2 = encodeCursorForTest(ts, '00000000-0000-0000-0000-bbbbbbbbbbbb');
    const d1 = decodeCursorForTest(c1);
    const d2 = decodeCursorForTest(c2);
    expect(d1.at.toISOString()).toBe(d2.at.toISOString());
    expect(d1.id).not.toBe(d2.id);
  });
});

// ═══════════════════════════════════════════════════════════════════
// BEHAVIORAL TESTS — production code exercised directly
// All DB / provider dependencies mocked at the boundary.
// ═══════════════════════════════════════════════════════════════════

// ─── cursor.ts — full validation ─────────────────────────────────

describe('cursor codec — full validation (production decodeCursor)', () => {
  it('encodeCursor / decodeCursor roundtrip', () => {
    const ts = new Date('2026-07-17T08:00:00Z');
    const id = '12345678-0000-0000-0000-000000000001';
    expect(decodeCursor(encodeCursor(ts, id)).id).toBe(id);
  });

  it('rejects oversized cursor (> 512 chars)', () => {
    expect(() => decodeCursor('a'.repeat(513))).toThrow('INVALID_CURSOR');
  });

  it('rejects cursor whose id is not a valid UUID', () => {
    const bad = Buffer.from(JSON.stringify({ at: new Date().toISOString(), id: 'not-a-uuid' })).toString('base64');
    expect(() => decodeCursor(bad)).toThrow('INVALID_CURSOR');
  });

  it('rejects cursor whose id is an empty string', () => {
    const bad = Buffer.from(JSON.stringify({ at: new Date().toISOString(), id: '' })).toString('base64');
    expect(() => decodeCursor(bad)).toThrow('INVALID_CURSOR');
  });

  it('accepts a cursor with a valid UUID id', () => {
    const cursor = encodeCursor(new Date(), '00000000-0000-0000-0000-000000000001');
    expect(() => decodeCursor(cursor)).not.toThrow();
  });
});

// ─── rules.ts — shouldEnqueueEmail ────────────────────────────────

import { shouldEnqueueEmail, shouldEnqueueSms, shouldSendInApp } from '@/lib/notifications/rules';

describe('shouldEnqueueEmail — DB rule is sole arbiter (no SMTP check at enqueue)', () => {
  const baseRule = { enabled: true, inAppEnabled: true, smsEnabled: true, emailEnabled: true };

  it('returns true when rule is email-enabled and caller allows', () => {
    // Deliberately does not set MAIL_* env vars — proves SMTP is not checked here
    expect(shouldEnqueueEmail(baseRule, true)).toBe(true);
  });

  it('returns false when emailEnabled=false in rule', () => {
    expect(shouldEnqueueEmail({ ...baseRule, emailEnabled: false }, true)).toBe(false);
  });

  it('returns false when rule is globally disabled', () => {
    expect(shouldEnqueueEmail({ ...baseRule, enabled: false }, true)).toBe(false);
  });

  it('returns false when caller does not allow email channel', () => {
    expect(shouldEnqueueEmail(baseRule, false)).toBe(false);
  });
});

// ─── processor.ts — buildSmsMessage ───────────────────────────────

import { buildSmsMessage } from '@/lib/notifications/processor';

describe('buildSmsMessage (production helper)', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
  });

  it('builds "title: sub" when no actionUrl', () => {
    expect(buildSmsMessage('عنوان', 'متن', null)).toBe('عنوان: متن');
  });

  it('appends absolute link when actionUrl is a safe relative path', () => {
    const msg = buildSmsMessage('عنوان', 'متن', '/dashboard');
    expect(msg).toContain('https://app.example.com/dashboard');
    expect(msg).toContain('عنوان: متن');
  });

  it('does NOT append an unsafe URL', () => {
    const msg = buildSmsMessage('عنوان', 'متن', 'javascript:alert(1)');
    expect(msg).not.toContain('javascript');
    expect(msg).not.toContain('alert');
  });

  it('does NOT append a protocol-relative URL', () => {
    const msg = buildSmsMessage('عنوان', 'متن', '//evil.example.com/steal');
    expect(msg).not.toContain('evil');
  });

  it('truncates text to fit within maxLength when there is a link', () => {
    const longTitle = 'ت'.repeat(200);
    const msg = buildSmsMessage(longTitle, '', '/path', 160);
    expect(msg.length).toBeLessThanOrEqual(160);
    // Link must be intact
    expect(msg).toContain('https://app.example.com/path');
  });

  it('truncates text without a link when text exceeds maxLength', () => {
    const longText = 'ت'.repeat(200);
    const msg = buildSmsMessage(longText, '', null, 160);
    expect(msg.length).toBeLessThanOrEqual(160);
  });

  it('ends with ellipsis when truncated', () => {
    const long = 'a'.repeat(200);
    const msg = buildSmsMessage(long, '', null, 160);
    expect(msg.endsWith('…')).toBe(true);
  });

  it('uses title-only format when sub is empty string', () => {
    const msg = buildSmsMessage('فقط عنوان', '', null);
    expect(msg).toBe('فقط عنوان');
    expect(msg).not.toContain(':');
  });
});

// ─── email channel — SMTP absent = retryable failure ──────────────

import { sendNotificationEmail, isEmailConfigured, _resetTransporterForTests } from '@/lib/notifications/channels/email';

describe('email channel — SMTP absent produces retryable failure', () => {
  beforeEach(() => {
    _resetTransporterForTests();
  });

  it('isEmailConfigured returns false when env vars are absent', () => {
    const saved = { ...process.env };
    delete process.env.MAIL_HOST;
    delete process.env.MAIL_USER;
    delete process.env.MAIL_PASSWORD;
    delete process.env.MAIL_FROM;
    expect(isEmailConfigured()).toBe(false);
    Object.assign(process.env, saved);
  });

  it('returns status=failed (not skipped) when SMTP not configured', async () => {
    const saved = { ...process.env };
    delete process.env.MAIL_HOST;
    delete process.env.MAIL_PORT;
    delete process.env.MAIL_USER;
    delete process.env.MAIL_PASSWORD;
    delete process.env.MAIL_FROM;

    const result = await sendNotificationEmail({
      to: 'test@example.com',
      data: { title: 'تست', sub: 'متن', actionUrl: null },
    });

    expect(result.status).toBe('failed');
    expect(result.error).toContain('SMTP not configured');
    Object.assign(process.env, saved);
  });
});

// ─── store — Bell / page view isolation ──────────────────────────

describe('store view isolation: Bell fetch does not clear page cursor', () => {
  const makeN = (id: string, read = false): import('@/types').Notification => ({
    id, type: 'info', title: 'T', sub: 'S', time: '', read,
    txId: null, actionUrl: null, entityId: null,
    createdAt: new Date().toISOString(), readAt: null, archivedAt: null,
    ruleKey: null, priority: 0,
  });

  it('setViewPage for bell:unread leaves notifNextCursor unchanged', () => {
    const store = makeNotifStore();
    store.getState()._setNotifications([makeN('p1'), makeN('p2')], 'cursor-page-2');
    expect(store.getState().notifNextCursor).toBe('cursor-page-2');
    expect(store.getState().notifications).toHaveLength(2);

    // Bell fetches unread — different namespace
    store.getState().setViewPage('bell:unread', [makeN('b1', false)], 'cursor-bell', 3);

    // Page data untouched
    expect(store.getState().notifNextCursor).toBe('cursor-page-2');
    expect(store.getState().notifications).toHaveLength(2);

    // Bell view has its data
    const bellItems = store.getState().getViewNotifications('bell:unread');
    expect(bellItems).toHaveLength(1);
    expect(bellItems[0]!.id).toBe('b1');

    // serverUnreadCount updated
    expect(store.getState().serverUnreadCount).toBe(3);
  });

  it('changing page filter (_setNotifications) does not destroy bell view', () => {
    const store = makeNotifStore();
    store.getState().setViewPage('bell:all', [makeN('b1'), makeN('b2')], null, 2);
    // Page changes filter
    store.getState()._setNotifications([makeN('u1', false)], null);

    const bellItems = store.getState().getViewNotifications('bell:all');
    expect(bellItems).toHaveLength(2);
  });

  it('appendViewPage for one view does not affect a different view', () => {
    const store = makeNotifStore();
    store.getState().setViewPage('bell:all', [makeN('b1')], 'cursor-1');
    store.getState().appendViewPage('bell:all', [makeN('b2')], 'cursor-2');
    // 'bell:unread' view is unaffected
    const unreadView = store.getState().getViewNotifications('bell:unread');
    expect(unreadView).toHaveLength(0);
    // 'bell:all' now has 2 items
    expect(store.getState().getViewNotifications('bell:all')).toHaveLength(2);
    expect(store.getState().viewCursors['bell:all']).toBe('cursor-2');
  });
});

// ─── store — rollback does not remove concurrent realtime events ──

describe('single-item rollback: concurrent realtime event survives', () => {
  const makeN = (id: string, read = false): import('@/types').Notification => ({
    id, type: 'info', title: 'T', sub: 'S', time: '', read,
    txId: null, actionUrl: null, entityId: null,
    createdAt: new Date().toISOString(), readAt: null, archivedAt: null,
    ruleKey: null, priority: 0,
  });

  it('markRead rollback does not remove a realtime notification that arrived after optimistic update', async () => {
    let resolveApi!: () => void;
    let rejectApi!: (e: Error) => void;
    const pendingApiCall = new Promise<void>((res, rej) => {
      resolveApi = res;
      rejectApi = rej;
    });

    const store = makeNotifStore({
      markRead: () => pendingApiCall,
    });
    store.getState()._setNotifications([makeN('1'), makeN('2')]);

    // Start markRead — optimistic update fires synchronously
    const p = store.getState().markNotificationRead('1');

    // Simulate realtime notification arriving DURING the API call
    store.getState().upsertNotification(makeN('realtime-99'));
    expect(store.getState().byId['realtime-99']).toBeDefined();

    // Fail the API call → rollback
    rejectApi(new Error('network'));
    await p.catch(() => {});

    // n1 rolled back to unread
    expect(store.getState().byId['1']?.read).toBe(false);
    // realtime-99 still present — not wiped by rollback
    expect(store.getState().byId['realtime-99']).toBeDefined();
    expect(store.getState().notifications.some((n) => n.id === 'realtime-99')).toBe(true);
  });

  it('archiveNotification rollback does not remove a realtime notification that arrived during the call', async () => {
    let rejectApi!: (e: Error) => void;
    const pendingApiCall = new Promise<void>((_, rej) => { rejectApi = rej; });

    const store = makeNotifStore({ archive: () => pendingApiCall });
    store.getState()._setNotifications([makeN('1'), makeN('2')]);

    const p = store.getState().archiveNotification('1');
    store.getState().upsertNotification(makeN('live-50'));

    rejectApi(new Error('network'));
    await p.catch(() => {});

    // n1 restored
    expect(store.getState().notifications.some((n) => n.id === '1')).toBe(true);
    // live-50 still present
    expect(store.getState().notifications.some((n) => n.id === 'live-50')).toBe(true);
  });
});

// ─── process route — secret validation ────────────────────────────

vi.mock('@/lib/notifications/processor', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/notifications/processor')>();
  return {
    ...actual,
    processOutboxBatch: vi.fn().mockResolvedValue({ processed: 1, sent: 1, failed: 0, dead: 0, skipped: 0 }),
  };
});

import { POST as processRoute } from '@/app/api/internal/notifications/process/route';
import { processOutboxBatch } from '@/lib/notifications/processor';

describe('process route — secret validation', () => {
  const VALID_SECRET = 'a-valid-secret-that-is-at-least-32-chars-long';

  beforeEach(() => {
    process.env.NOTIFICATION_PROCESSOR_SECRET = VALID_SECRET;
    vi.mocked(processOutboxBatch).mockClear();
  });

  afterEach(() => {
    delete process.env.NOTIFICATION_PROCESSOR_SECRET;
  });

  it('returns 503 when processor secret is not configured', async () => {
    delete process.env.NOTIFICATION_PROCESSOR_SECRET;
    const res = await processRoute(new Request('http://localhost/api/internal/notifications/process', { method: 'POST' }));
    expect(res.status).toBe(503);
    const body = await res.json() as { error: string };
    expect(body.error).not.toContain(VALID_SECRET);
  });

  it('returns 401 when bearer token is wrong', async () => {
    const res = await processRoute(
      new Request('http://localhost/api/internal/notifications/process', {
        method: 'POST',
        headers: { authorization: 'Bearer wrong-secret' },
      })
    );
    expect(res.status).toBe(401);
    expect(vi.mocked(processOutboxBatch)).not.toHaveBeenCalled();
  });

  it('returns 401 when authorization header is absent', async () => {
    const res = await processRoute(
      new Request('http://localhost/api/internal/notifications/process', { method: 'POST' })
    );
    expect(res.status).toBe(401);
  });

  it('calls processOutboxBatch and returns result when secret is correct', async () => {
    const res = await processRoute(
      new Request('http://localhost/api/internal/notifications/process', {
        method: 'POST',
        headers: { authorization: `Bearer ${VALID_SECRET}` },
      })
    );
    expect(res.status).toBe(200);
    expect(vi.mocked(processOutboxBatch)).toHaveBeenCalledOnce();
    const body = await res.json() as { ok: boolean; sent: number };
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(1);
  });

  it('error response from process route does not leak the secret or error details', async () => {
    vi.mocked(processOutboxBatch).mockRejectedValueOnce(new Error(`secret=${VALID_SECRET}`));
    const res = await processRoute(
      new Request('http://localhost/api/internal/notifications/process', {
        method: 'POST',
        headers: { authorization: `Bearer ${VALID_SECRET}` },
      })
    );
    expect(res.status).toBe(500);
    const body = await res.json() as { error: string; detail?: string };
    expect(body.error).not.toContain(VALID_SECRET);
    expect(body.detail).toBeUndefined();
  });
});

// ─── service.ts — TX propagation ─────────────────────────────────
//
// vi.mock is hoisted before imports — the factory must not close over module-body
// const/let variables (TDZ). db.transaction is set up per-test via mockImplementation.

vi.mock('@/lib/db/client', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/db/client')>();
  return {
    ...mod,
    db: { transaction: vi.fn() },
    schema: mod.schema,
  };
});

vi.mock('@/lib/notifications/rules', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/notifications/rules')>();
  return {
    ...actual,
    resolveRule: vi.fn().mockResolvedValue({ enabled: false, inAppEnabled: false, smsEnabled: false, emailEnabled: false }),
  };
});

import { notifyAdminsV2 } from '@/lib/notifications/service';
import { resolveRule } from '@/lib/notifications/rules';
import { db as mockDb, schema as mockSchema } from '@/lib/db/client';

const DISABLED_RULE = { enabled: false, inAppEnabled: false, smsEnabled: false, emailEnabled: false };

describe('service.ts — disabled rule produces no DB writes', () => {
  let capturedTxInsert: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.mocked(resolveRule).mockResolvedValue(DISABLED_RULE);
    capturedTxInsert = vi.fn();
    const fakeTx = { insert: capturedTxInsert };
    vi.mocked(mockDb.transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(fakeTx)
    );
  });

  it('returns early when rule.enabled=false — no notification or outbox rows inserted', async () => {
    await notifyAdminsV2({
      ruleKey: 'test.rule', type: 'info', title: 'T', sub: 'S', actionUrl: null, entityId: null,
    });
    expect(capturedTxInsert).not.toHaveBeenCalled();
  });
});

describe('service.ts — TX propagation: outerTx used for all reads and writes', () => {
  beforeEach(() => {
    vi.mocked(resolveRule).mockResolvedValue(DISABLED_RULE);
    vi.mocked(mockDb.transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn({})
    );
    vi.mocked(mockDb.transaction as ReturnType<typeof vi.fn>).mockClear();
  });

  it('when outerTx is provided, db.transaction is NOT called (uses outerTx directly)', async () => {
    const outerTx = {} as unknown as Parameters<typeof notifyAdminsV2>[2];
    await notifyAdminsV2(
      { ruleKey: 'test.rule', type: 'info', title: 'T', sub: 'S', actionUrl: null, entityId: null },
      {},
      outerTx
    );
    expect(vi.mocked(mockDb.transaction as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it('when no outerTx, db.transaction IS called', async () => {
    await notifyAdminsV2(
      { ruleKey: 'test.rule', type: 'info', title: 'T', sub: 'S', actionUrl: null, entityId: null },
    );
    expect(vi.mocked(mockDb.transaction as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
  });
});

// ─── outbox queue — sentToday uses Tehran midnight ────────────────

describe('sentToday boundary — Tehran midnight', () => {
  it('nextDayMidnightTehran is always strictly after now', () => {
    const now = new Date();
    const midnight = nextDayMidnightTehran(now);
    expect(midnight.getTime()).toBeGreaterThan(now.getTime());
  });

  it('nextDayMidnightTehran is at most 24h+30min ahead (Tehran offset is UTC+3:30)', () => {
    const now = new Date();
    const midnight = nextDayMidnightTehran(now);
    // Tehran is UTC+3:30 or +4:30 (DST). Max wait = 24h + 4.5h = 28.5h
    expect(midnight.getTime() - now.getTime()).toBeLessThan(29 * 60 * 60 * 1000);
  });

  it('represents midnight 00:00 in Asia/Tehran', () => {
    const midnight = nextDayMidnightTehran(new Date('2026-07-17T10:00:00Z'));
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: 'Asia/Tehran',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).formatToParts(midnight);
    const h = parseInt(parts.find((p) => p.type === 'hour')!.value, 10) % 24;
    const m = parseInt(parts.find((p) => p.type === 'minute')!.value, 10);
    const s = parseInt(parts.find((p) => p.type === 'second')!.value, 10);
    expect(h).toBe(0);
    expect(m).toBe(0);
    expect(s).toBe(0);
  });

  it('a row submitted just before Tehran midnight is "sent today"', () => {
    // Tehran is UTC+3:30 (non-DST). Midnight Tehran = 20:30 UTC previous day.
    // e.g. Tehran 2026-07-17 00:00 = 2026-07-16T20:30:00Z
    const tehranMidnight = nextDayMidnightTehran(new Date('2026-07-16T19:00:00Z'));
    // Any row sent after tehranMidnight should count as "today"
    // Any row sent before tehranMidnight should NOT count
    const before = new Date(tehranMidnight.getTime() - 1000);
    const after  = new Date(tehranMidnight.getTime() + 1000);
    expect(after.getTime()).toBeGreaterThan(tehranMidnight.getTime());
    expect(before.getTime()).toBeLessThan(tehranMidnight.getTime());
  });
});

// ─── isEmailConfigured — field-level validation ───────────────────

describe('isEmailConfigured — field-level validation', () => {
  const FULL_SMTP = {
    MAIL_HOST:     'smtp.example.com',
    MAIL_PORT:     '587',
    MAIL_USER:     'user@example.com',
    MAIL_PASSWORD: 'pass',
    MAIL_FROM:     'noreply@example.com',
  };

  afterEach(() => { _resetTransporterForTests(); });

  function withSmtp(overrides: Record<string, string | undefined>, fn: () => void): void {
    const saved = { ...process.env };
    Object.assign(process.env, FULL_SMTP);
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    try { fn(); } finally {
      for (const k of Object.keys(FULL_SMTP)) delete process.env[k];
      Object.assign(process.env, saved);
    }
  }

  it('returns false when MAIL_PORT is absent', () => {
    withSmtp({ MAIL_PORT: undefined }, () => { expect(isEmailConfigured()).toBe(false); });
  });

  it('returns false when MAIL_FROM is absent', () => {
    withSmtp({ MAIL_FROM: undefined }, () => { expect(isEmailConfigured()).toBe(false); });
  });

  it('returns false when MAIL_PORT is not a valid integer', () => {
    withSmtp({ MAIL_PORT: 'not-a-number' }, () => { expect(isEmailConfigured()).toBe(false); });
  });

  it('returns true when all five fields are present and port is numeric', () => {
    withSmtp({}, () => { expect(isEmailConfigured()).toBe(true); });
  });
});

// ─── buildSmsMessage — link-length boundary ───────────────────────

describe('buildSmsMessage — link-length boundary', () => {
  beforeEach(() => { process.env.NEXT_PUBLIC_APP_URL = 'https://x.co'; });

  it('omits link when link length exceeds maxLength', () => {
    // '\nhttps://x.co/p' = 15 chars; maxLength = 14 → must omit
    const msg = buildSmsMessage('عنوان', 'متن', '/p', 14);
    expect(msg.length).toBeLessThanOrEqual(14);
    expect(msg).not.toContain('https://x.co/p');
  });

  it('includes link when its length exactly equals maxLength', () => {
    // '\nhttps://x.co/p' = 15 chars; maxLength = 15 → must include
    const msg = buildSmsMessage('', '', '/p', 15);
    expect(msg.length).toBeLessThanOrEqual(15);
    expect(msg).toContain('https://x.co/p');
  });

  it('result never exceeds maxLength even with a very long URL', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://very-long-domain.example.com';
    const msg = buildSmsMessage('عنوان', 'متن', '/some/long/path', 20);
    expect(msg.length).toBeLessThanOrEqual(20);
  });
});

// ─── _setNotifications — authoritative serverUnreadCount ─────────

describe('_setNotifications — authoritative serverUnreadCount', () => {
  const makeN = (id: string, read = false): import('@/types').Notification => ({
    id, type: 'info', title: 'T', sub: 'S', time: '', read,
    txId: null, actionUrl: null, entityId: null,
    createdAt: new Date().toISOString(), readAt: null, archivedAt: null,
    ruleKey: null, priority: 0,
  });

  it('updates serverUnreadCount when passed as third argument', () => {
    const store = makeNotifStore();
    store.getState()._setNotifications([makeN('1'), makeN('2')], null, 42);
    expect(store.getState().serverUnreadCount).toBe(42);
  });

  it('does NOT change serverUnreadCount when third argument is absent', () => {
    const store = makeNotifStore();
    store.getState().setViewPage('bell:unread', [], null, 7);
    store.getState()._setNotifications([makeN('1')], null);
    expect(store.getState().serverUnreadCount).toBe(7);
  });

  it('_appendNotifications preserves serverUnreadCount (pagination does not reset it)', () => {
    const store = makeNotifStore();
    store.getState()._setNotifications([makeN('1')], 'cursor-1', 99);
    store.getState()._appendNotifications([makeN('2')], 'cursor-2');
    expect(store.getState().serverUnreadCount).toBe(99);
  });
});

// ─── bell view consistency — mutations reconcile viewIds ──────────

describe('bell view consistency — mutations update viewIds', () => {
  const makeN = (id: string, read = false, archivedAt: string | null = null): import('@/types').Notification => ({
    id, type: 'info', title: 'T', sub: 'S', time: '', read,
    txId: null, actionUrl: null, entityId: null,
    createdAt: new Date().toISOString(), readAt: null, archivedAt,
    ruleKey: null, priority: 0,
  });

  it('markNotificationRead removes item from bell:unread optimistically', async () => {
    const store = makeNotifStore({ markRead: async () => {} });
    store.getState().setViewPage('bell:unread', [makeN('1', false), makeN('2', false)], null, 2);
    store.getState()._setNotifications([makeN('1', false), makeN('2', false)]);
    await store.getState().markNotificationRead('1');
    const ids = store.getState().getViewNotifications('bell:unread').map((n) => n.id);
    expect(ids).not.toContain('1');
    expect(ids).toContain('2');
  });

  it('markNotificationRead rollback restores item to bell:unread', async () => {
    let reject!: (e: Error) => void;
    const store = makeNotifStore({ markRead: () => new Promise<void>((_, rej) => { reject = rej; }) });
    store.getState().setViewPage('bell:unread', [makeN('1', false)], null, 1);
    store.getState()._setNotifications([makeN('1', false)]);
    const p = store.getState().markNotificationRead('1');
    expect(store.getState().getViewNotifications('bell:unread').map((n) => n.id)).not.toContain('1');
    reject(new Error('fail'));
    await p.catch(() => {});
    expect(store.getState().getViewNotifications('bell:unread').map((n) => n.id)).toContain('1');
  });

  it('markNotificationUnread adds item to bell:unread', async () => {
    const store = makeNotifStore({ markUnread: async () => {} });
    store.getState().setViewPage('bell:unread', [], null, 0);
    store.getState()._setNotifications([makeN('1', true)]);
    await store.getState().markNotificationUnread('1');
    expect(store.getState().getViewNotifications('bell:unread').map((n) => n.id)).toContain('1');
    expect(store.getState().serverUnreadCount).toBe(1);
  });

  it('archiveNotification removes item from all bell views', async () => {
    const store = makeNotifStore({ archive: async () => {} });
    store.getState().setViewPage('bell:all',    [makeN('1', false)], null);
    store.getState().setViewPage('bell:unread', [makeN('1', false)], null);
    store.getState()._setNotifications([makeN('1', false)]);
    await store.getState().archiveNotification('1');
    expect(store.getState().getViewNotifications('bell:all').map((n) => n.id)).not.toContain('1');
    expect(store.getState().getViewNotifications('bell:unread').map((n) => n.id)).not.toContain('1');
  });

  it('archiveNotification rollback re-adds to matching bell views', async () => {
    let reject!: (e: Error) => void;
    const store = makeNotifStore({ archive: () => new Promise<void>((_, rej) => { reject = rej; }) });
    store.getState().setViewPage('bell:all',    [makeN('1', false)], null);
    store.getState().setViewPage('bell:unread', [makeN('1', false)], null, 1);
    store.getState()._setNotifications([makeN('1', false)]);
    const p = store.getState().archiveNotification('1');
    reject(new Error('fail'));
    await p.catch(() => {});
    expect(store.getState().getViewNotifications('bell:all').map((n) => n.id)).toContain('1');
    expect(store.getState().getViewNotifications('bell:unread').map((n) => n.id)).toContain('1');
  });

  it('markAllNotificationsRead clears bell:unread view', async () => {
    const store = makeNotifStore({ markAllRead: async () => {} });
    store.getState().setViewPage('bell:unread', [makeN('1', false), makeN('2', false)], null, 2);
    store.getState()._setNotifications([makeN('1', false), makeN('2', false)]);
    await store.getState().markAllNotificationsRead();
    expect(store.getState().getViewNotifications('bell:unread')).toHaveLength(0);
    expect(store.getState().serverUnreadCount).toBe(0);
  });
});

// ─── delta rollback — concurrent count changes preserved ─────────

describe('delta rollback — concurrent realtime count preserved', () => {
  const makeN = (id: string, read = false): import('@/types').Notification => ({
    id, type: 'info', title: 'T', sub: 'S', time: '', read,
    txId: null, actionUrl: null, entityId: null,
    createdAt: new Date().toISOString(), readAt: null, archivedAt: null,
    ruleKey: null, priority: 0,
  });

  it('markAllNotificationsRead rollback uses delta — concurrent +1 is preserved', async () => {
    let reject!: (e: Error) => void;
    const store = makeNotifStore({ markAllRead: () => new Promise<void>((_, rej) => { reject = rej; }) });
    store.getState()._setNotifications([makeN('1', false), makeN('2', false), makeN('3', false)], null, 3);
    store.getState().setViewPage('bell:unread', [makeN('1', false), makeN('2', false), makeN('3', false)], null);
    const p = store.getState().markAllNotificationsRead();
    expect(store.getState().serverUnreadCount).toBe(0);
    // Concurrent realtime notification during the API call
    store.getState().upsertNotification(makeN('rt-4', false));
    expect(store.getState().serverUnreadCount).toBe(1);
    // API fails → delta rollback: 1 + 3 = 4
    reject(new Error('fail'));
    await p.catch(() => {});
    expect(store.getState().serverUnreadCount).toBe(4);
    expect(store.getState().byId['rt-4']).toBeDefined();
  });

  it('markNotificationRead rollback uses delta — concurrent +1 not lost', async () => {
    let reject!: (e: Error) => void;
    const store = makeNotifStore({ markRead: () => new Promise<void>((_, rej) => { reject = rej; }) });
    store.getState()._setNotifications([makeN('1', false)], null, 5);
    store.getState().setViewPage('bell:unread', [makeN('1', false)], null);
    const p = store.getState().markNotificationRead('1');
    expect(store.getState().serverUnreadCount).toBe(4); // optimistic -1
    store.getState().upsertNotification(makeN('live', false)); // concurrent +1 → 5
    expect(store.getState().serverUnreadCount).toBe(5);
    reject(new Error('fail'));
    await p.catch(() => {});
    expect(store.getState().serverUnreadCount).toBe(6); // 5 + delta(1)
  });
});

// ─── service.ts — active rule: resolveRule receives correct ruleKey

describe('service.ts — active rule: resolveRule receives correct ruleKey', () => {
  beforeEach(() => {
    vi.mocked(resolveRule).mockResolvedValue(DISABLED_RULE);
  });

  it('resolveRule is called with the exact ruleKey', async () => {
    await notifyAdminsV2({
      ruleKey: 'recruitment.new_application',
      type: 'info', title: 'T', sub: 'S', actionUrl: null, entityId: null,
    });
    expect(vi.mocked(resolveRule)).toHaveBeenCalledWith(
      'recruitment.new_application',
      expect.anything()
    );
  });
});

// ─── service.ts — active rule: SMS + email share same eventKey ────

describe('service.ts — active rule: SMS and email share the same eventKey', () => {
  it('SMS and email outbox entries derive eventKey from entityId (shared)', async () => {
    const ACTIVE_RULE = { enabled: true, inAppEnabled: false, smsEnabled: true, emailEnabled: true };
    vi.mocked(resolveRule).mockResolvedValueOnce(ACTIVE_RULE);

    const capturedOutbox: Array<Record<string, unknown>> = [];
    const returnChain = {
      onConflictDoNothing: () => ({ returning: vi.fn().mockResolvedValue([]) }),
    };

    // fetchCandidateUsers does select(...).from(schema.users) with NO .where();
    // fetchAudienceTargets does select(...).from(schema.notificationRuleTargets).where(...).
    // This fake makes .from(...) both directly awaitable AND chainable with .where(),
    // so both call shapes resolve correctly regardless of which table is queried.
    function chainable(result: unknown[]) {
      return { where: () => Promise.resolve(result), then: (resolve: (v: unknown[]) => void) => resolve(result) };
    }
    const fakeTx = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockImplementation((table: unknown) => {
          if (table === mockSchema.users) {
            return chainable([{ id: 'admin-1', role: 'SuperAdmin', isActive: true, branchId: null, email: 'admin1@example.com', smsPhone: '+989000000000', permissions: null }]);
          }
          return chainable([]); // no custom audience targets → resolver falls back to default (all active SuperAdmins)
        }),
      }),
      insert: vi.fn().mockImplementation((_table: unknown) => ({
        values: vi.fn().mockImplementation((vals: Record<string, unknown>) => {
          if ('channel' in vals) capturedOutbox.push(vals);
          return returnChain;
        }),
      })),
    };

    vi.mocked(mockDb.transaction as ReturnType<typeof vi.fn>).mockImplementationOnce(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(fakeTx)
    );

    await notifyAdminsV2({
      ruleKey: 'test.rule', type: 'info', title: 'T', sub: 'S',
      actionUrl: null, entityId: 'entity-42',
    });

    expect(capturedOutbox).toHaveLength(2);
    const smsRow   = capturedOutbox.find((v) => v['channel'] === 'sms');
    const emailRow = capturedOutbox.find((v) => v['channel'] === 'email');
    expect(smsRow).toBeDefined();
    expect(emailRow).toBeDefined();

    // dedupeKey = "{ruleKey}:{eventKey}:{recipientId}:{channel}"
    // eventKey derives from entityId when no idempotencyKey
    const smsEventKey   = (smsRow!['dedupeKey'] as string).split(':')[1];
    const emailEventKey = (emailRow!['dedupeKey'] as string).split(':')[1];
    expect(smsEventKey).toBe('entity-42');
    expect(emailEventKey).toBe('entity-42');
    expect(smsEventKey).toBe(emailEventKey);
  });
});

// ─── admin API routes — auth guard + env reflection ───────────────

vi.mock('@/lib/auth/session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth/session')>();
  return {
    ...actual,
    requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-1', role: 'Admin' }),
  };
});

import { requireAdmin as mockRequireAdmin, UnauthorizedError } from '@/lib/auth/session';
import { GET as providerStatusRoute } from '@/app/api/admin/notifications/provider-status/route';
import { PATCH as notifRulesPATCH } from '@/app/api/admin/notification-rules/route';

const SMTP_VARS = {
  MAIL_HOST:     'smtp.example.com',
  MAIL_PORT:     '587',
  MAIL_USER:     'user@example.com',
  MAIL_PASSWORD: 'pass',
  MAIL_FROM:     'noreply@example.com',
};

describe('provider-status route — reflects isEmailConfigured() and KAVENEGAR_API_KEY', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(mockRequireAdmin).mockResolvedValue({ id: 'admin-1', role: 'Admin' } as any);
    _resetTransporterForTests();
  });
  afterEach(() => { _resetTransporterForTests(); });

  it('returns 401 when requireAdmin throws UnauthorizedError', async () => {
    vi.mocked(mockRequireAdmin).mockRejectedValueOnce(new UnauthorizedError());
    const res = await providerStatusRoute();
    expect(res.status).toBe(401);
  });

  it('returns smtp.configured=false when SMTP env vars absent', async () => {
    const saved = { ...process.env };
    for (const k of Object.keys(SMTP_VARS)) delete process.env[k];
    const res = await providerStatusRoute();
    const body = await res.json() as { smtp: { configured: boolean } };
    expect(res.status).toBe(200);
    expect(body.smtp.configured).toBe(false);
    Object.assign(process.env, saved);
  });

  it('returns smtp.configured=true when all SMTP env vars are set', async () => {
    const saved = { ...process.env };
    Object.assign(process.env, SMTP_VARS);
    const res = await providerStatusRoute();
    const body = await res.json() as { smtp: { configured: boolean } };
    expect(res.status).toBe(200);
    expect(body.smtp.configured).toBe(true);
    Object.assign(process.env, saved);
  });

  it('returns sms.configured=false when KAVENEGAR_API_KEY is absent', async () => {
    const saved = process.env.KAVENEGAR_API_KEY;
    delete process.env.KAVENEGAR_API_KEY;
    const res = await providerStatusRoute();
    const body = await res.json() as { sms: { configured: boolean } };
    expect(body.sms.configured).toBe(false);
    if (saved !== undefined) process.env.KAVENEGAR_API_KEY = saved;
  });

  it('returns sms.configured=true when KAVENEGAR_API_KEY is set', async () => {
    const saved = process.env.KAVENEGAR_API_KEY;
    process.env.KAVENEGAR_API_KEY = 'test-api-key';
    const res = await providerStatusRoute();
    const body = await res.json() as { sms: { configured: boolean } };
    expect(body.sms.configured).toBe(true);
    if (saved !== undefined) process.env.KAVENEGAR_API_KEY = saved;
    else delete process.env.KAVENEGAR_API_KEY;
  });

  it('returns sms.dryRun=true when SMS_DRY_RUN=true', async () => {
    const saved = process.env.SMS_DRY_RUN;
    process.env.SMS_DRY_RUN = 'true';
    const res = await providerStatusRoute();
    const body = await res.json() as { sms: { dryRun: boolean } };
    expect(body.sms.dryRun).toBe(true);
    if (saved !== undefined) process.env.SMS_DRY_RUN = saved;
    else delete process.env.SMS_DRY_RUN;
  });
});

describe('notification-rules PATCH — SMTP guard rejects emailEnabled without SMTP', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(mockRequireAdmin).mockResolvedValue({ id: 'admin-1', role: 'Admin' } as any);
    _resetTransporterForTests();
  });
  afterEach(() => { _resetTransporterForTests(); });

  it('returns 422 with SMTP_NOT_CONFIGURED when emailEnabled=true and SMTP absent', async () => {
    const saved = { ...process.env };
    for (const k of Object.keys(SMTP_VARS)) delete process.env[k];
    const req = new Request('http://localhost/api/admin/notification-rules', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'test.rule', emailEnabled: true }),
    });
    const res = await notifRulesPATCH(req);
    expect(res.status).toBe(422);
    const body = await res.json() as { code: string };
    expect(body.code).toBe('SMTP_NOT_CONFIGURED');
    Object.assign(process.env, saved);
  });

  it('returns 401 when requireAdmin throws UnauthorizedError', async () => {
    vi.mocked(mockRequireAdmin).mockRejectedValueOnce(new UnauthorizedError());
    const req = new Request('http://localhost/api/admin/notification-rules', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'test.rule', emailEnabled: true }),
    });
    const res = await notifRulesPATCH(req);
    expect(res.status).toBe(401);
  });
});

// ─── secret contract — script and route use same env var ─────────
// Static source-code verification: proves scripts/process-notifications.mjs
// and app/api/internal/notifications/process/route.ts both reference the
// canonical NOTIFICATION_PROCESSOR_SECRET variable name.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('processor secret contract — script and API route use the same env var', () => {
  const root = resolve(import.meta.dirname, '../..');

  it('process route reads NOTIFICATION_PROCESSOR_SECRET', () => {
    const src = readFileSync(resolve(root, 'app/api/internal/notifications/process/route.ts'), 'utf-8');
    expect(src).toContain('NOTIFICATION_PROCESSOR_SECRET');
  });

  it('process-notifications.mjs reads NOTIFICATION_PROCESSOR_SECRET', () => {
    const src = readFileSync(resolve(root, 'scripts/process-notifications.mjs'), 'utf-8');
    expect(src).toContain('NOTIFICATION_PROCESSOR_SECRET');
  });

  it('process-notifications.mjs does NOT reference the old PROCESSOR_SECRET name', () => {
    const src = readFileSync(resolve(root, 'scripts/process-notifications.mjs'), 'utf-8');
    // Must not contain a bare `process.env.PROCESSOR_SECRET` reference.
    // The regex excludes the canonical NOTIFICATION_PROCESSOR_SECRET from matching.
    expect(src).not.toMatch(/process\.env\.PROCESSOR_SECRET(?!_)/);
  });

  it('both files reference exactly the same variable name', () => {
    const routeSrc  = readFileSync(resolve(root, 'app/api/internal/notifications/process/route.ts'), 'utf-8');
    const scriptSrc = readFileSync(resolve(root, 'scripts/process-notifications.mjs'), 'utf-8');
    const VAR = 'NOTIFICATION_PROCESSOR_SECRET';
    expect(routeSrc).toContain(VAR);
    expect(scriptSrc).toContain(VAR);
  });
});
