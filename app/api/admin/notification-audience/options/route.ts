/**
 * GET /api/admin/notification-audience/options
 *
 * Selectable users, roles and branches for the recipient-management drawer.
 * SuperAdmin-only. Never returns password hashes or raw phone numbers —
 * only readiness booleans + masked contact values.
 */

import { NextResponse } from 'next/server';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';
import { maskEmail, maskPhone } from '@/lib/notifications/redaction';

export const dynamic = 'force-dynamic';

const ROLE_LABELS: Record<string, string> = {
  SuperAdmin: 'مدیر کل',
  BranchUser: 'کاربر شعبه',
  Warehouse: 'انباردار',
  Chef: 'سرآشپز',
};

export async function GET() {
  try {
    await requireAdmin();

    const [users, branches] = await Promise.all([
      db
        .select({
          id: schema.users.id,
          name: schema.users.name,
          role: schema.users.role,
          isActive: schema.users.isActive,
          branchId: schema.users.assignedBranchId,
          email: schema.users.email,
          smsPhone: schema.users.smsPhone,
        })
        .from(schema.users)
        .orderBy(schema.users.name),
      db
        .select({ id: schema.branches.id, name: schema.branches.name })
        .from(schema.branches)
        .orderBy(schema.branches.name),
    ]);

    const branchNameById = new Map(branches.map((b) => [b.id, b.name]));

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        role: u.role,
        isActive: u.isActive,
        branchId: u.branchId,
        branchName: u.branchId ? branchNameById.get(u.branchId) ?? null : null,
        emailReady: !!u.email,
        smsReady: !!u.smsPhone,
        maskedEmail: u.email ? maskEmail(u.email) : null,
        maskedPhone: u.smsPhone ? maskPhone(u.smsPhone) : null,
      })),
      roles: Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label })),
      branches,
    });
  } catch (e) {
    return handleError(e);
  }
}
