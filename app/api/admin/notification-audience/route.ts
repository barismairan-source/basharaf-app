/**
 * SuperAdmin API — notification audience & access control.
 *
 * GET  — rules enriched with catalog metadata + per-channel recipient
 *        summary (uses one unfiltered targets query + one users query,
 *        then resolves every rule×channel combination in memory — no N+1).
 * POST — action-discriminated mutation/preview endpoint, matching the
 *        existing convention in app/api/admin/notification-outbox/route.ts:
 *          { action: 'preview', ruleKey, targets? }
 *          { action: 'replace', ruleKey, targets, expectedUpdatedAt }
 *          { action: 'copy',    ruleKey, fromChannel, toChannel, expectedUpdatedAt }
 *          { action: 'reset',   ruleKey, expectedUpdatedAt }
 *
 * requireAdmin() gates every handler — including preview, since it reveals
 * user names/roles/branches/masked contact info.
 */

import { NextResponse } from 'next/server';
import { eq, and, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { audit } from '@/lib/auth/audit';
import { handleError, ApiError } from '@/lib/api-error';
import { getCatalogEntry, RULE_CATALOG } from '@/lib/notifications/catalog';
import {
  resolveAudience,
  fetchAllAudienceTargets,
  fetchAudienceTargets,
  fetchCandidateUsers,
  type AudienceChannel,
  type AudienceTargetRow,
  type CandidateUser,
} from '@/lib/notifications/audience';
import { targetInputSchema, dedupeTargets, type TargetInput } from '@/lib/notifications/audienceValidation';
import { maskEmail, maskPhone } from '@/lib/notifications/redaction';

export const dynamic = 'force-dynamic';

const CHANNELS: readonly AudienceChannel[] = ['in_app', 'sms', 'email'];

function toTargetRow(t: TargetInput): AudienceTargetRow {
  return {
    channel: t.channel,
    effect: t.effect,
    targetType: t.targetType,
    roleTarget: t.roleTarget ?? null,
    branchTarget: t.branchTarget ?? null,
    userTarget: t.userTarget ?? null,
  };
}

function requireAudienceConfigurable(ruleKey: string) {
  const entry = getCatalogEntry(ruleKey);
  if (!entry) throw new ApiError(404, 'قانون در کاتالوگ یافت نشد', 'RULE_NOT_IN_CATALOG');
  if (!entry.audienceConfigurable) {
    throw new ApiError(
      422,
      'این قانون یک اعلان شخصی است و گیرنده‌ی قابل‌تنظیم ندارد',
      'NOT_AUDIENCE_CONFIGURABLE'
    );
  }
  return entry;
}

// ─── GET — rule list with catalog metadata + audience summary ──────

export async function GET() {
  try {
    await requireAdmin();

    const [rules, allTargets, users, branches] = await Promise.all([
      db.select().from(schema.notificationRules).orderBy(schema.notificationRules.key),
      fetchAllAudienceTargets(),
      fetchCandidateUsers(),
      db.select({ id: schema.branches.id, name: schema.branches.name }).from(schema.branches),
    ]);
    void branches; // reserved for future per-branch summary; not needed at list-level today

    const result = rules.map((r) => {
      const catalogEntry = getCatalogEntry(r.key);
      const targets = allTargets.get(r.key) ?? [];

      const audience = Object.fromEntries(
        CHANNELS.map((ch) => {
          if (!catalogEntry?.audienceConfigurable) {
            return [ch, { recipientCount: 0, custom: false }];
          }
          const resolved = resolveAudience({ ruleKey: r.key, channel: ch, targets, users, eventBranchId: null });
          const recipientCount = resolved.filter((x) => x.eligible).length;
          const custom = targets.some((t) => t.channel === ch || t.channel === null);
          return [ch, { recipientCount, custom }];
        })
      );

      return {
        key: r.key,
        enabled: r.enabled,
        smsEnabled: r.smsEnabled,
        inAppEnabled: r.inAppEnabled,
        emailEnabled: r.emailEnabled,
        threshold: r.threshold,
        updatedAt: r.updatedAt.toISOString(),
        catalog: catalogEntry
          ? {
              title: catalogEntry.title,
              description: catalogEntry.description,
              category: catalogEntry.category,
              trigger: catalogEntry.trigger,
              thresholdType: catalogEntry.thresholdType,
              thresholdUnit: catalogEntry.thresholdUnit,
              branchAware: catalogEntry.branchAware,
              sensitivity: catalogEntry.sensitivity,
              audienceConfigurable: catalogEntry.audienceConfigurable,
              hiddenFromUi: catalogEntry.hiddenFromUi ?? false,
            }
          : {
              title: r.label,
              description: r.description ?? '',
              category: 'سیستم' as const,
              trigger: '',
              thresholdType: null,
              thresholdUnit: null,
              branchAware: false,
              sensitivity: 'low' as const,
              audienceConfigurable: false,
              hiddenFromUi: true,
            },
        audience,
        targets: targets.map((t) => ({
          channel: t.channel,
          effect: t.effect,
          targetType: t.targetType,
          roleTarget: t.roleTarget,
          branchTarget: t.branchTarget,
          userTarget: t.userTarget,
        })),
      };
    });

    return NextResponse.json({ rules: result, categories: [...new Set(RULE_CATALOG.map((r) => r.category))] });
  } catch (e) {
    return handleError(e);
  }
}

// ─── POST — action dispatch ─────────────────────────────────────────

const postSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('preview'),
    ruleKey: z.string().min(1),
    targets: z.array(targetInputSchema).optional(),
  }),
  z.object({
    action: z.literal('replace'),
    ruleKey: z.string().min(1),
    targets: z.array(targetInputSchema),
    expectedUpdatedAt: z.string().min(1),
  }),
  z.object({
    action: z.literal('copy'),
    ruleKey: z.string().min(1),
    fromChannel: z.enum(['in_app', 'email', 'sms']).nullable(),
    toChannel: z.enum(['in_app', 'email', 'sms']).nullable(),
    expectedUpdatedAt: z.string().min(1),
  }),
  z.object({
    action: z.literal('reset'),
    ruleKey: z.string().min(1),
    expectedUpdatedAt: z.string().min(1),
  }),
]);

interface PreviewRecipient {
  userId: string;
  name: string;
  role: string;
  branchName: string | null;
  isActive: boolean;
  eligible: boolean;
  reason: string | null;
  emailReady: boolean;
  smsReady: boolean;
  maskedEmail: string | null;
  maskedPhone: string | null;
}

async function loadUsersWithNames(): Promise<Array<CandidateUser & { name: string }>> {
  const rows = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      role: schema.users.role,
      isActive: schema.users.isActive,
      branchId: schema.users.assignedBranchId,
      email: schema.users.email,
      smsPhone: schema.users.smsPhone,
      permissions: schema.users.permissions,
    })
    .from(schema.users);
  return rows.map((r) => ({ ...r, permissions: r.permissions ?? null }));
}

async function handlePreview(ruleKey: string, draftTargets: TargetInput[] | undefined) {
  requireAudienceConfigurable(ruleKey);

  const targets: AudienceTargetRow[] = draftTargets
    ? dedupeTargets(draftTargets).map(toTargetRow)
    : await fetchAudienceTargets(ruleKey);

  const [users, branches] = await Promise.all([
    loadUsersWithNames(),
    db.select({ id: schema.branches.id, name: schema.branches.name }).from(schema.branches),
  ]);
  const branchNameById = new Map(branches.map((b) => [b.id, b.name]));
  const userById = new Map(users.map((u) => [u.id, u]));

  const result: Record<AudienceChannel, PreviewRecipient[]> = { in_app: [], sms: [], email: [] };
  for (const ch of CHANNELS) {
    const resolved = resolveAudience({ ruleKey, channel: ch, targets, users, eventBranchId: null });
    result[ch] = resolved.map((r) => {
      const u = userById.get(r.userId)!;
      return {
        userId: u.id,
        name: u.name,
        role: u.role,
        branchName: u.branchId ? branchNameById.get(u.branchId) ?? null : null,
        isActive: u.isActive,
        eligible: r.eligible,
        reason: r.reason ?? null,
        emailReady: !!u.email,
        smsReady: !!u.smsPhone,
        maskedEmail: u.email ? maskEmail(u.email) : null,
        maskedPhone: u.smsPhone ? maskPhone(u.smsPhone) : null,
      };
    });
  }
  return result;
}

async function handleReplace(
  sessionUserId: string,
  ruleKey: string,
  rawTargets: TargetInput[],
  expectedUpdatedAt: string
) {
  requireAudienceConfigurable(ruleKey);
  const targets = dedupeTargets(rawTargets);

  return db.transaction(async (tx) => {
    const [rule] = await tx
      .select()
      .from(schema.notificationRules)
      .where(eq(schema.notificationRules.key, ruleKey))
      .for('update')
      .limit(1);
    if (!rule) throw new ApiError(404, 'قانون پیدا نشد', 'NOT_FOUND');
    if (rule.updatedAt.toISOString() !== expectedUpdatedAt) {
      throw new ApiError(409, 'این قانون توسط جلسه‌ی دیگری ویرایش شده — صفحه را رفرش کنید', 'STALE_UPDATE');
    }

    await tx.delete(schema.notificationRuleTargets).where(eq(schema.notificationRuleTargets.ruleKey, ruleKey));

    if (targets.length > 0) {
      try {
        await tx.insert(schema.notificationRuleTargets).values(
          targets.map((t) => ({
            ruleKey,
            channel: t.channel,
            effect: t.effect,
            targetType: t.targetType,
            roleTarget: t.roleTarget ?? null,
            branchTarget: t.branchTarget ?? null,
            userTarget: t.userTarget ?? null,
          }))
        );
      } catch {
        throw new ApiError(400, 'ترکیب گیرندگان نامعتبر یا تکراری است', 'INVALID_TARGETS');
      }
    }

    const [updated] = await tx
      .update(schema.notificationRules)
      .set({ updatedAt: new Date() })
      .where(eq(schema.notificationRules.key, ruleKey))
      .returning();

    await audit({
      action: 'notification.audience.updated',
      userId: sessionUserId,
      meta: { ruleKey, targetCount: targets.length },
    });

    return updated!;
  });
}

async function handleCopy(
  sessionUserId: string,
  ruleKey: string,
  fromChannel: AudienceChannel | null,
  toChannel: AudienceChannel | null,
  expectedUpdatedAt: string
) {
  requireAudienceConfigurable(ruleKey);

  return db.transaction(async (tx) => {
    const [rule] = await tx
      .select()
      .from(schema.notificationRules)
      .where(eq(schema.notificationRules.key, ruleKey))
      .for('update')
      .limit(1);
    if (!rule) throw new ApiError(404, 'قانون پیدا نشد', 'NOT_FOUND');
    if (rule.updatedAt.toISOString() !== expectedUpdatedAt) {
      throw new ApiError(409, 'این قانون توسط جلسه‌ی دیگری ویرایش شده — صفحه را رفرش کنید', 'STALE_UPDATE');
    }

    const fromClause = fromChannel === null
      ? isNull(schema.notificationRuleTargets.channel)
      : eq(schema.notificationRuleTargets.channel, fromChannel);
    const toClause = toChannel === null
      ? isNull(schema.notificationRuleTargets.channel)
      : eq(schema.notificationRuleTargets.channel, toChannel);

    const fromRows = await tx
      .select()
      .from(schema.notificationRuleTargets)
      .where(and(eq(schema.notificationRuleTargets.ruleKey, ruleKey), fromClause));

    await tx
      .delete(schema.notificationRuleTargets)
      .where(and(eq(schema.notificationRuleTargets.ruleKey, ruleKey), toClause));

    if (fromRows.length > 0) {
      await tx.insert(schema.notificationRuleTargets).values(
        fromRows.map((r) => ({
          ruleKey,
          channel: toChannel,
          effect: r.effect,
          targetType: r.targetType,
          roleTarget: r.roleTarget,
          branchTarget: r.branchTarget,
          userTarget: r.userTarget,
        }))
      );
    }

    const [updated] = await tx
      .update(schema.notificationRules)
      .set({ updatedAt: new Date() })
      .where(eq(schema.notificationRules.key, ruleKey))
      .returning();

    await audit({
      action: 'notification.audience.copied',
      userId: sessionUserId,
      meta: { ruleKey, fromChannel, toChannel, copiedCount: fromRows.length },
    });

    return updated!;
  });
}

async function handleReset(sessionUserId: string, ruleKey: string, expectedUpdatedAt: string) {
  requireAudienceConfigurable(ruleKey);

  return db.transaction(async (tx) => {
    const [rule] = await tx
      .select()
      .from(schema.notificationRules)
      .where(eq(schema.notificationRules.key, ruleKey))
      .for('update')
      .limit(1);
    if (!rule) throw new ApiError(404, 'قانون پیدا نشد', 'NOT_FOUND');
    if (rule.updatedAt.toISOString() !== expectedUpdatedAt) {
      throw new ApiError(409, 'این قانون توسط جلسه‌ی دیگری ویرایش شده — صفحه را رفرش کنید', 'STALE_UPDATE');
    }

    await tx.delete(schema.notificationRuleTargets).where(eq(schema.notificationRuleTargets.ruleKey, ruleKey));

    const [updated] = await tx
      .update(schema.notificationRules)
      .set({ updatedAt: new Date() })
      .where(eq(schema.notificationRules.key, ruleKey))
      .returning();

    await audit({ action: 'notification.audience.reset', userId: sessionUserId, meta: { ruleKey } });

    return updated!;
  });
}

export async function POST(req: Request) {
  try {
    const session = await requireAdmin();
    const body = postSchema.parse(await req.json());

    if (body.action === 'preview') {
      const result = await handlePreview(body.ruleKey, body.targets);
      return NextResponse.json({ ruleKey: body.ruleKey, recipients: result });
    }

    if (body.action === 'replace') {
      const updated = await handleReplace(session.sub, body.ruleKey, body.targets, body.expectedUpdatedAt);
      return NextResponse.json({ rule: { key: updated.key, updatedAt: updated.updatedAt.toISOString() } });
    }

    if (body.action === 'copy') {
      const updated = await handleCopy(
        session.sub,
        body.ruleKey,
        body.fromChannel,
        body.toChannel,
        body.expectedUpdatedAt
      );
      return NextResponse.json({ rule: { key: updated.key, updatedAt: updated.updatedAt.toISOString() } });
    }

    // action === 'reset'
    const updated = await handleReset(session.sub, body.ruleKey, body.expectedUpdatedAt);
    return NextResponse.json({ rule: { key: updated.key, updatedAt: updated.updatedAt.toISOString() } });
  } catch (e) {
    return handleError(e);
  }
}
