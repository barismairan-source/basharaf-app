/**
 * Notification Audience & Access Control — behavioral tests.
 *
 * Section 1 (resolveAudience, dedupeTargets, targetInputSchema, catalog
 * helpers) needs no DB — all pure functions, imported and exercised directly.
 *
 * Section 2 (service.ts integration) mocks only the DB-fetching edges of
 * lib/notifications/audience.ts (fetchAudienceTargets/fetchCandidateUsers)
 * and lib/notifications/rules.ts (resolveRule) — resolveAudience itself runs
 * for real via importOriginal, so the actual resolution logic is exercised
 * end-to-end without a database.
 *
 * Section 3 (API route) mocks requireAdmin + a minimal chainable db fake to
 * prove auth gating, Zod validation, and the 409 stale-update path.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Section 1 — resolveAudience (pure) ────────────────────────────

import {
  resolveAudience,
  type AudienceTargetRow,
  type CandidateUser,
} from '@/lib/notifications/audience';

function user(overrides: Partial<CandidateUser> & { id: string }): CandidateUser {
  return {
    role: 'BranchUser',
    isActive: true,
    branchId: null,
    email: 'user@example.com',
    smsPhone: '09121234567',
    permissions: null,
    ...overrides,
  };
}

function target(overrides: Partial<AudienceTargetRow>): AudienceTargetRow {
  return {
    channel: null,
    effect: 'include',
    targetType: 'all_active',
    roleTarget: null,
    branchTarget: null,
    userTarget: null,
    ...overrides,
  };
}

describe('resolveAudience — default (no configuration)', () => {
  it('falls back to all active SuperAdmins when no targets exist at all — backward compatible', () => {
    const users = [
      user({ id: 'sa1', role: 'SuperAdmin' }),
      user({ id: 'sa2', role: 'SuperAdmin' }),
      user({ id: 'bu1', role: 'BranchUser' }),
    ];
    const result = resolveAudience({ ruleKey: 'high_value_tx', channel: 'in_app', targets: [], users });
    const eligible = result.filter((r) => r.eligible).map((r) => r.userId).sort();
    expect(eligible).toEqual(['sa1', 'sa2']);
  });

  it('an inactive SuperAdmin appears in the default audience as ineligible/inactive, not silently dropped', () => {
    const users = [user({ id: 'sa1', role: 'SuperAdmin', isActive: false })];
    const result = resolveAudience({ ruleKey: 'high_value_tx', channel: 'in_app', targets: [], users });
    expect(result).toEqual([{ userId: 'sa1', eligible: false, reason: 'inactive' }]);
  });
});

describe('resolveAudience — inclusion target types', () => {
  it('targetType=user includes exactly that user', () => {
    const users = [user({ id: 'a' }), user({ id: 'b' })];
    const targets = [target({ targetType: 'user', userTarget: 'b' })];
    const result = resolveAudience({ ruleKey: 'k', channel: 'in_app', targets, users });
    expect(result.map((r) => r.userId)).toEqual(['b']);
  });

  it('targetType=role includes every active user with that role', () => {
    const users = [
      user({ id: 'a', role: 'Warehouse' }),
      user({ id: 'b', role: 'Warehouse' }),
      user({ id: 'c', role: 'Chef' }),
    ];
    const targets = [target({ targetType: 'role', roleTarget: 'Warehouse' })];
    const result = resolveAudience({ ruleKey: 'k', channel: 'in_app', targets, users });
    expect(result.map((r) => r.userId).sort()).toEqual(['a', 'b']);
  });

  it('targetType=branch includes every active user assigned to that branch', () => {
    const users = [
      user({ id: 'a', branchId: 'b1' }),
      user({ id: 'b', branchId: 'b2' }),
      user({ id: 'c', branchId: null }),
    ];
    const targets = [target({ targetType: 'branch', branchTarget: 'b1' })];
    const result = resolveAudience({ ruleKey: 'k', channel: 'in_app', targets, users });
    expect(result.map((r) => r.userId)).toEqual(['a']);
  });

  it('targetType=all_active includes every active user regardless of role', () => {
    const users = [
      user({ id: 'a', role: 'SuperAdmin' }),
      user({ id: 'b', role: 'Chef' }),
      user({ id: 'c', role: 'Warehouse', isActive: false }),
    ];
    const targets = [target({ targetType: 'all_active' })];
    const result = resolveAudience({ ruleKey: 'k', channel: 'in_app', targets, users });
    expect(result.filter((r) => r.eligible).map((r) => r.userId).sort()).toEqual(['a', 'b']);
    expect(result.find((r) => r.userId === 'c')).toEqual({ userId: 'c', eligible: false, reason: 'inactive' });
  });

  it('targetType=event_branch matches only users in the branch the event belongs to', () => {
    const users = [
      user({ id: 'a', branchId: 'b1' }),
      user({ id: 'b', branchId: 'b2' }),
    ];
    const targets = [target({ targetType: 'event_branch' })];
    const result = resolveAudience({ ruleKey: 'k', channel: 'in_app', targets, users, eventBranchId: 'b1' });
    expect(result.map((r) => r.userId)).toEqual(['a']);
  });

  it('targetType=event_branch matches nobody when the event has no branch', () => {
    const users = [user({ id: 'a', branchId: 'b1' })];
    const targets = [target({ targetType: 'event_branch' })];
    const result = resolveAudience({ ruleKey: 'k', channel: 'in_app', targets, users, eventBranchId: null });
    expect(result).toEqual([]);
  });
});

describe('resolveAudience — exclusions override inclusions', () => {
  it('a user matched by both an include and an exclude target is excluded', () => {
    const users = [user({ id: 'a', role: 'Warehouse' })];
    const targets = [
      target({ targetType: 'role', roleTarget: 'Warehouse', effect: 'include' }),
      target({ targetType: 'user', userTarget: 'a', effect: 'exclude' }),
    ];
    const result = resolveAudience({ ruleKey: 'k', channel: 'in_app', targets, users });
    expect(result).toEqual([]);
  });

  it('exclusion order in the array does not matter — exclude always wins', () => {
    const users = [user({ id: 'a', role: 'Warehouse' })];
    const targets = [
      target({ targetType: 'user', userTarget: 'a', effect: 'exclude' }),
      target({ targetType: 'role', roleTarget: 'Warehouse', effect: 'include' }),
    ];
    const result = resolveAudience({ ruleKey: 'k', channel: 'in_app', targets, users });
    expect(result).toEqual([]);
  });
});

describe('resolveAudience — custom audience resolving to zero (rule 5)', () => {
  it('a custom audience with only exclude targets (no matching include) sends to nobody — no fallback to default', () => {
    const users = [user({ id: 'sa1', role: 'SuperAdmin' })];
    const targets = [target({ targetType: 'user', userTarget: 'sa1', effect: 'exclude' })];
    const result = resolveAudience({ ruleKey: 'k', channel: 'in_app', targets, users });
    expect(result).toEqual([]);
  });

  it('an include target matching nobody (deleted user reference) resolves to zero, not a crash', () => {
    const users = [user({ id: 'a' })];
    const targets = [target({ targetType: 'user', userTarget: 'ghost-id-not-in-users' })];
    const result = resolveAudience({ ruleKey: 'k', channel: 'in_app', targets, users });
    expect(result).toEqual([]);
  });
});

describe('resolveAudience — per-channel audiences and channel override', () => {
  const users = [user({ id: 'a', role: 'SuperAdmin' }), user({ id: 'b', role: 'Warehouse' })];

  it('a shared (channel=null) target applies to every channel with no channel-specific override', () => {
    const targets = [target({ channel: null, targetType: 'user', userTarget: 'b' })];
    expect(resolveAudience({ ruleKey: 'k', channel: 'in_app', targets, users }).map((r) => r.userId)).toEqual(['b']);
    expect(resolveAudience({ ruleKey: 'k', channel: 'sms', targets, users }).map((r) => r.userId)).toEqual(['b']);
  });

  it('a channel-specific target completely overrides the shared target for that channel only', () => {
    const targets = [
      target({ channel: null, targetType: 'user', userTarget: 'b' }),
      target({ channel: 'sms', targetType: 'user', userTarget: 'a' }),
    ];
    expect(resolveAudience({ ruleKey: 'k', channel: 'sms', targets, users }).map((r) => r.userId)).toEqual(['a']);
    // in_app has no channel-specific row → falls back to the shared target
    expect(resolveAudience({ ruleKey: 'k', channel: 'in_app', targets, users }).map((r) => r.userId)).toEqual(['b']);
  });
});

describe('resolveAudience — address readiness (email/sms) and access gating', () => {
  it('email channel requires a stored email — missing email is ineligible with reason', () => {
    const users = [user({ id: 'a', role: 'SuperAdmin', email: '' })];
    const result = resolveAudience({ ruleKey: 'k', channel: 'email', targets: [], users });
    expect(result).toEqual([{ userId: 'a', eligible: false, reason: 'missing_email' }]);
  });

  it('sms channel requires a stored smsPhone — missing phone is ineligible with reason', () => {
    const users = [user({ id: 'a', role: 'SuperAdmin', smsPhone: null })];
    const result = resolveAudience({ ruleKey: 'k', channel: 'sms', targets: [], users });
    expect(result).toEqual([{ userId: 'a', eligible: false, reason: 'missing_phone' }]);
  });

  it('a rule with requiredSection excludes users without that section access, but SuperAdmin always passes', () => {
    // high_value_tx.requiredSection = 'transactions'; BranchUser has it by default role, Warehouse does not.
    const users = [
      user({ id: 'sa', role: 'SuperAdmin' }),
      user({ id: 'wh', role: 'Warehouse' }),
    ];
    const targets = [target({ targetType: 'all_active' })];
    const result = resolveAudience({ ruleKey: 'high_value_tx', channel: 'in_app', targets, users });
    expect(result.find((r) => r.userId === 'sa')).toEqual({ userId: 'sa', eligible: true });
    expect(result.find((r) => r.userId === 'wh')).toEqual({ userId: 'wh', eligible: false, reason: 'missing_access' });
  });

  it('a rule with requiredCapability excludes users lacking that capability (voucher_pending needs inventory.approve)', () => {
    const users = [
      user({ id: 'sa', role: 'SuperAdmin' }),
      user({ id: 'bu', role: 'BranchUser' }), // BranchUser does not have inventory.approve by default
    ];
    const targets = [target({ targetType: 'all_active' })];
    const result = resolveAudience({ ruleKey: 'voucher_pending', channel: 'in_app', targets, users });
    expect(result.find((r) => r.userId === 'sa')?.eligible).toBe(true);
    expect(result.find((r) => r.userId === 'bu')).toEqual({ userId: 'bu', eligible: false, reason: 'missing_access' });
  });

  it('an explicitly-targeted inactive user shows in the results as ineligible/inactive (visible in preview, never sent)', () => {
    const users = [user({ id: 'a', isActive: false })];
    const targets = [target({ targetType: 'user', userTarget: 'a' })];
    const result = resolveAudience({ ruleKey: 'k', channel: 'in_app', targets, users });
    expect(result).toEqual([{ userId: 'a', eligible: false, reason: 'inactive' }]);
  });
});

// ─── Section 1b — dedupeTargets + targetInputSchema ────────────────

import { dedupeTargets, targetInputSchema } from '@/lib/notifications/audienceValidation';

describe('dedupeTargets', () => {
  it('removes exact duplicate target rows', () => {
    const t = { channel: null, effect: 'include' as const, targetType: 'role' as const, roleTarget: 'SuperAdmin' as const, branchTarget: null, userTarget: null };
    const result = dedupeTargets([t, { ...t }, t]);
    expect(result).toHaveLength(1);
  });

  it('keeps rows that differ only by channel', () => {
    const base = { effect: 'include' as const, targetType: 'role' as const, roleTarget: 'SuperAdmin' as const, branchTarget: null, userTarget: null };
    const result = dedupeTargets([{ ...base, channel: 'sms' }, { ...base, channel: 'email' }]);
    expect(result).toHaveLength(2);
  });
});

describe('targetInputSchema — shape validation', () => {
  it('accepts a well-formed role target', () => {
    const r = targetInputSchema.safeParse({ channel: null, effect: 'include', targetType: 'role', roleTarget: 'SuperAdmin' });
    expect(r.success).toBe(true);
  });

  it('rejects targetType=role with no roleTarget', () => {
    const r = targetInputSchema.safeParse({ channel: null, effect: 'include', targetType: 'role' });
    expect(r.success).toBe(false);
  });

  it('rejects targetType=all_active carrying an unrelated branchTarget', () => {
    const r = targetInputSchema.safeParse({
      channel: null, effect: 'include', targetType: 'all_active',
      branchTarget: '11111111-1111-1111-1111-111111111111',
    });
    expect(r.success).toBe(false);
  });

  it('rejects a non-uuid userTarget', () => {
    const r = targetInputSchema.safeParse({ channel: null, effect: 'include', targetType: 'user', userTarget: 'not-a-uuid' });
    expect(r.success).toBe(false);
  });

  it('accepts targetType=event_branch with no target fields', () => {
    const r = targetInputSchema.safeParse({ channel: 'sms', effect: 'exclude', targetType: 'event_branch' });
    expect(r.success).toBe(true);
  });
});

// ─── Section 1c — catalog ───────────────────────────────────────────

import { isAudienceConfigurable, getCatalogEntry } from '@/lib/notifications/catalog';

describe('catalog — personal vs broadcast rules', () => {
  it('pending_approval is not audience-configurable (personal single-recipient notification)', () => {
    expect(isAudienceConfigurable('pending_approval')).toBe(false);
  });

  it('high_value_tx and recruitment.new_application are audience-configurable broadcast rules', () => {
    expect(isAudienceConfigurable('high_value_tx')).toBe(true);
    expect(isAudienceConfigurable('recruitment.new_application')).toBe(true);
  });

  it('unknown rule keys default to configurable=true (fail open on catalog gaps, not silently hidden)', () => {
    expect(isAudienceConfigurable('some.future.rule')).toBe(true);
    expect(getCatalogEntry('some.future.rule')).toBeUndefined();
  });

  it('the 6 anomaly-detective rule keys are present in the catalog under دستیار مالی', () => {
    for (const key of ['waste_spike', 'below_approval_limit', 'consumption_spike', 'rejection_pattern', 'price_jump', 'off_hours_activity']) {
      expect(getCatalogEntry(key)?.category).toBe('دستیار مالی');
    }
  });
});

// ─── Section 2 — service.ts integration (per-channel audience end-to-end) ──

vi.mock('@/lib/db/client', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/db/client')>();
  return { ...mod, db: { transaction: vi.fn() }, schema: mod.schema };
});

vi.mock('@/lib/notifications/rules', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/notifications/rules')>();
  return { ...actual, resolveRule: vi.fn() };
});

vi.mock('@/lib/notifications/audience', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/notifications/audience')>();
  return {
    ...actual,
    fetchAudienceTargets: vi.fn(),
    fetchCandidateUsers: vi.fn(),
  };
});

describe('service.ts — per-channel audience resolution end-to-end', () => {
  it('in-app and sms audiences can differ for the same event; eventKey/dedupe shared; no duplicate rows', async () => {
    const { notifyAdminsV2 } = await import('@/lib/notifications/service');
    const { resolveRule } = await import('@/lib/notifications/rules');
    const { fetchAudienceTargets, fetchCandidateUsers } = await import('@/lib/notifications/audience');
    const { db: mockDb, schema } = await import('@/lib/db/client');

    vi.mocked(resolveRule).mockResolvedValue({ enabled: true, inAppEnabled: true, smsEnabled: true, emailEnabled: false });

    const users: CandidateUser[] = [
      user({ id: 'sa1', role: 'SuperAdmin' }),                 // eligible on both in_app and sms
      user({ id: 'sa2', role: 'SuperAdmin', smsPhone: null }), // eligible on in_app; ineligible on sms (no phone)
    ];
    vi.mocked(fetchCandidateUsers).mockResolvedValue(users);
    // shared target: all active SuperAdmins (equivalent to default, but explicit so both sa1/sa2 are candidates)
    vi.mocked(fetchAudienceTargets).mockResolvedValue([
      { channel: null, effect: 'include', targetType: 'role', roleTarget: 'SuperAdmin', branchTarget: null, userTarget: null },
    ]);

    const insertedNotifications: Array<Record<string, unknown>> = [];
    const insertedOutbox: Array<Record<string, unknown>> = [];

    const fakeTx = {
      insert: vi.fn((table: unknown) => ({
        values: (vals: Record<string, unknown>) => ({
          onConflictDoNothing: () => ({
            returning: async () => {
              if (table === schema.notificationOutbox) {
                insertedOutbox.push(vals);
                return [{ id: `outbox-${insertedOutbox.length}` }];
              }
              insertedNotifications.push(vals);
              return [{ id: `notif-${insertedNotifications.length}` }];
            },
          }),
        }),
      })),
      update: vi.fn(() => ({ set: () => ({ where: async () => [] }) })),
    };
    vi.mocked(mockDb.transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(fakeTx)
    );

    await notifyAdminsV2(
      { ruleKey: 'high_value_tx', type: 'critical', title: 'T', sub: 'S', actionUrl: null, entityId: 'evt-1' },
      { sms: true, email: false }
    );

    // in-app: both sa1 and sa2 (smsPhone irrelevant for in_app channel)
    expect(insertedNotifications).toHaveLength(2);
    // sms: only sa1 (sa2 has no phone → excluded before write time)
    expect(insertedOutbox).toHaveLength(1);
    expect(insertedOutbox[0]!.recipientId).toBe('sa1');

    // eventKey (entityId here) drives both dedupe keys — same event, consistent prefix
    expect(insertedNotifications.every((n) => (n.dedupeKey as string).startsWith('high_value_tx:evt-1:'))).toBe(true);
    expect((insertedOutbox[0]!.dedupeKey as string)).toBe('high_value_tx:evt-1:sa1:sms');
  });

  it('a rule with zero eligible recipients on every requested channel writes nothing', async () => {
    const { notifyAdminsV2 } = await import('@/lib/notifications/service');
    const { resolveRule } = await import('@/lib/notifications/rules');
    const { fetchAudienceTargets, fetchCandidateUsers } = await import('@/lib/notifications/audience');
    const { db: mockDb } = await import('@/lib/db/client');

    vi.mocked(resolveRule).mockResolvedValue({ enabled: true, inAppEnabled: true, smsEnabled: false, emailEnabled: false });
    vi.mocked(fetchCandidateUsers).mockResolvedValue([user({ id: 'sa1', role: 'SuperAdmin' })]);
    // custom audience that excludes the only candidate → zero, no fallback
    vi.mocked(fetchAudienceTargets).mockResolvedValue([
      { channel: null, effect: 'exclude', targetType: 'user', roleTarget: null, branchTarget: null, userTarget: 'sa1' },
    ]);

    const insertFn = vi.fn();
    const fakeTx = { insert: insertFn };
    vi.mocked(mockDb.transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(fakeTx)
    );

    await notifyAdminsV2({ ruleKey: 'high_value_tx', type: 'critical', title: 'T', sub: 'S', actionUrl: null, entityId: 'evt-2' });

    expect(insertFn).not.toHaveBeenCalled();
  });
});
