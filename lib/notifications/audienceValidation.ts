/**
 * Shared Zod schema + helpers for validating audience-target input coming
 * from the admin API (preview/replace/copy). Kept separate from
 * lib/notifications/audience.ts so that file stays pure/DB-shaped.
 */

import { z } from 'zod';

export const targetInputSchema = z
  .object({
    channel: z.enum(['in_app', 'email', 'sms']).nullable(),
    effect: z.enum(['include', 'exclude']),
    targetType: z.enum(['all_active', 'role', 'branch', 'event_branch', 'user']),
    roleTarget: z.enum(['SuperAdmin', 'BranchUser', 'Warehouse', 'Chef']).nullable().optional(),
    branchTarget: z.string().uuid().nullable().optional(),
    userTarget: z.string().uuid().nullable().optional(),
  })
  .superRefine((val, ctx) => {
    const hasRole = val.roleTarget != null;
    const hasBranch = val.branchTarget != null;
    const hasUser = val.userTarget != null;

    const validShape =
      (val.targetType === 'all_active' && !hasRole && !hasBranch && !hasUser) ||
      (val.targetType === 'event_branch' && !hasRole && !hasBranch && !hasUser) ||
      (val.targetType === 'role' && hasRole && !hasBranch && !hasUser) ||
      (val.targetType === 'branch' && hasBranch && !hasRole && !hasUser) ||
      (val.targetType === 'user' && hasUser && !hasRole && !hasBranch);

    if (!validShape) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `targetType='${val.targetType}' requires exactly its matching target field (role/branch/user) and no others`,
        path: ['targetType'],
      });
    }
  });

export type TargetInput = z.infer<typeof targetInputSchema>;

/** Normalizes + de-duplicates targets before persisting (defense-in-depth alongside the DB unique index). */
export function dedupeTargets(targets: readonly TargetInput[]): TargetInput[] {
  const seen = new Set<string>();
  const out: TargetInput[] = [];
  for (const t of targets) {
    const key = [
      t.channel ?? '*',
      t.effect,
      t.targetType,
      t.roleTarget ?? '',
      t.branchTarget ?? '',
      t.userTarget ?? '',
    ].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}
