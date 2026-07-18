/**
 * Audience resolver — decides exactly which users receive a given
 * notification rule, per channel.
 *
 * `resolveAudience` is a pure function (no DB access) so the resolution
 * contract can be unit tested with plain objects. `resolveRecipientsForRule`
 * is the thin DB-fetching wrapper used by lib/notifications/service.ts.
 *
 * Resolution contract (see project spec — kept here as the canonical list):
 *  1. Only active users are eligible to actually receive anything.
 *  2. Exclusions always override inclusions.
 *  3. Channel-specific targets override shared/default targets entirely
 *     (if ANY row exists for this exact channel, shared rows are ignored).
 *  4. No targets at all for a rule+channel → preserve existing behavior:
 *     all active SuperAdmins.
 *  5. A custom audience that resolves to zero users → send to nobody;
 *     never silently fall back to the default.
 *  6. Email requires a stored user email.
 *  7. SMS requires a stored smsPhone.
 *  9. Receiving a notification never grants data access by itself.
 * 10. A recipient must already have the rule's required section/capability
 *     before being marked eligible for delivery of details.
 * 11. Targeted-but-ineligible users are returned (with a reason) so the
 *     admin preview can show them — callers filter by `eligible` before
 *     actually sending.
 */

import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { canAccessSection, canDo } from '@/lib/auth/permissions';
import { getCatalogEntry } from './catalog';
import type { OutboxChannel } from './types';

export type AudienceChannel = 'in_app' | OutboxChannel;
export type TargetEffect = 'include' | 'exclude';
export type TargetType = 'all_active' | 'role' | 'branch' | 'event_branch' | 'user';
export type UserRole = 'SuperAdmin' | 'BranchUser' | 'Warehouse' | 'Chef';

const DEFAULT_ROLE: UserRole = 'SuperAdmin';

export interface AudienceTargetRow {
  channel: AudienceChannel | null;
  effect: TargetEffect;
  targetType: TargetType;
  roleTarget: string | null;
  branchTarget: string | null;
  userTarget: string | null;
}

export interface CandidateUser {
  id: string;
  role: UserRole;
  isActive: boolean;
  branchId: string | null;
  email: string;
  smsPhone: string | null;
  permissions: string[] | null;
}

export type IneligibleReason = 'inactive' | 'missing_email' | 'missing_phone' | 'missing_access';

export interface ResolvedRecipient {
  userId: string;
  eligible: boolean;
  reason?: IneligibleReason;
}

export interface ResolveAudienceInput {
  ruleKey: string;
  channel: AudienceChannel;
  targets: readonly AudienceTargetRow[];
  users: readonly CandidateUser[];
  /** The branch the triggering event belongs to, if any — powers 'event_branch' targeting. */
  eventBranchId?: string | null;
}

function matchesTarget(user: CandidateUser, t: AudienceTargetRow, eventBranchId: string | null): boolean {
  switch (t.targetType) {
    case 'all_active':
      return true;
    case 'role':
      return user.role === t.roleTarget;
    case 'branch':
      return user.branchId !== null && user.branchId === t.branchTarget;
    case 'event_branch':
      return eventBranchId !== null && user.branchId !== null && user.branchId === eventBranchId;
    case 'user':
      return user.id === t.userTarget;
    default:
      return false;
  }
}

/**
 * Resolves the recipient list for one rule+channel. Pure — no I/O.
 * Returns every targeted user (active or not) with an eligibility verdict;
 * callers that actually send must filter `eligible === true`.
 */
export function resolveAudience(input: ResolveAudienceInput): ResolvedRecipient[] {
  const { channel, users, targets, eventBranchId = null } = input;

  const channelSpecific = targets.filter((t) => t.channel === channel);
  const shared = targets.filter((t) => t.channel === null);
  const applicable = channelSpecific.length > 0 ? channelSpecific : shared;

  const includedIds = new Set<string>();

  if (applicable.length === 0) {
    // No configuration at all → preserve default: all active SuperAdmins.
    // (Inactive SuperAdmins are included here too so they surface in the
    // preview as ineligible/'inactive' — the eligible-only send list ends
    // up identical to the old hardcoded `role=SuperAdmin AND is_active` query.)
    for (const u of users) {
      if (u.role === DEFAULT_ROLE) includedIds.add(u.id);
    }
  } else {
    const includeTargets = applicable.filter((t) => t.effect === 'include');
    const excludeTargets = applicable.filter((t) => t.effect === 'exclude');

    for (const u of users) {
      if (includeTargets.some((t) => matchesTarget(u, t, eventBranchId))) includedIds.add(u.id);
    }
    for (const u of users) {
      if (excludeTargets.some((t) => matchesTarget(u, t, eventBranchId))) includedIds.delete(u.id);
    }
    // Resolves to zero → includedIds stays empty. No fallback (rule 5).
  }

  const catalogEntry = getCatalogEntry(input.ruleKey);
  const requiredSection = catalogEntry?.requiredSection ?? null;
  const requiredCapability = catalogEntry?.requiredCapability ?? null;

  const results: ResolvedRecipient[] = [];
  for (const u of users) {
    if (!includedIds.has(u.id)) continue;

    if (!u.isActive) {
      results.push({ userId: u.id, eligible: false, reason: 'inactive' });
      continue;
    }
    if (requiredSection && !canAccessSection(u, requiredSection)) {
      results.push({ userId: u.id, eligible: false, reason: 'missing_access' });
      continue;
    }
    if (requiredCapability && !canDo(u, requiredCapability)) {
      results.push({ userId: u.id, eligible: false, reason: 'missing_access' });
      continue;
    }
    if (channel === 'email' && !u.email) {
      results.push({ userId: u.id, eligible: false, reason: 'missing_email' });
      continue;
    }
    if (channel === 'sms' && !u.smsPhone) {
      results.push({ userId: u.id, eligible: false, reason: 'missing_phone' });
      continue;
    }
    results.push({ userId: u.id, eligible: true });
  }
  return results;
}

// ─────────────────────────────────────────────────────────────────
// DB-fetching wrappers (used by service.ts and the admin API)
// ─────────────────────────────────────────────────────────────────

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Client = DbTx | typeof db;

export async function fetchAudienceTargets(
  ruleKey: string,
  client: Client = db
): Promise<AudienceTargetRow[]> {
  const rows = await (client as typeof db)
    .select({
      channel: schema.notificationRuleTargets.channel,
      effect: schema.notificationRuleTargets.effect,
      targetType: schema.notificationRuleTargets.targetType,
      roleTarget: schema.notificationRuleTargets.roleTarget,
      branchTarget: schema.notificationRuleTargets.branchTarget,
      userTarget: schema.notificationRuleTargets.userTarget,
    })
    .from(schema.notificationRuleTargets)
    .where(eq(schema.notificationRuleTargets.ruleKey, ruleKey));

  return rows.map((r) => ({
    channel: r.channel as AudienceChannel | null,
    effect: r.effect as TargetEffect,
    targetType: r.targetType as TargetType,
    roleTarget: r.roleTarget,
    branchTarget: r.branchTarget,
    userTarget: r.userTarget,
  }));
}

/** All targets for every rule in one query — used by the admin list view to avoid N+1. */
export async function fetchAllAudienceTargets(client: Client = db): Promise<Map<string, AudienceTargetRow[]>> {
  const rows = await (client as typeof db)
    .select({
      ruleKey: schema.notificationRuleTargets.ruleKey,
      channel: schema.notificationRuleTargets.channel,
      effect: schema.notificationRuleTargets.effect,
      targetType: schema.notificationRuleTargets.targetType,
      roleTarget: schema.notificationRuleTargets.roleTarget,
      branchTarget: schema.notificationRuleTargets.branchTarget,
      userTarget: schema.notificationRuleTargets.userTarget,
    })
    .from(schema.notificationRuleTargets);

  const byRule = new Map<string, AudienceTargetRow[]>();
  for (const r of rows) {
    const list = byRule.get(r.ruleKey) ?? [];
    list.push({
      channel: r.channel as AudienceChannel | null,
      effect: r.effect as TargetEffect,
      targetType: r.targetType as TargetType,
      roleTarget: r.roleTarget,
      branchTarget: r.branchTarget,
      userTarget: r.userTarget,
    });
    byRule.set(r.ruleKey, list);
  }
  return byRule;
}

export async function fetchCandidateUsers(client: Client = db): Promise<CandidateUser[]> {
  const rows = await (client as typeof db)
    .select({
      id: schema.users.id,
      role: schema.users.role,
      isActive: schema.users.isActive,
      branchId: schema.users.assignedBranchId,
      email: schema.users.email,
      smsPhone: schema.users.smsPhone,
      permissions: schema.users.permissions,
    })
    .from(schema.users);

  return rows.map((r) => ({
    id: r.id,
    role: r.role as UserRole,
    isActive: r.isActive,
    branchId: r.branchId,
    email: r.email,
    smsPhone: r.smsPhone,
    permissions: r.permissions ?? null,
  }));
}

/** Convenience one-shot resolver for a single rule+channel (used by the preview API). */
export async function resolveRecipientsForRule(
  ruleKey: string,
  channel: AudienceChannel,
  eventBranchId: string | null = null,
  client: Client = db
): Promise<ResolvedRecipient[]> {
  const [targets, users] = await Promise.all([
    fetchAudienceTargets(ruleKey, client),
    fetchCandidateUsers(client),
  ]);
  return resolveAudience({ ruleKey, channel, targets, users, eventBranchId });
}
