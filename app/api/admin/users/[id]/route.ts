import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { audit } from '@/lib/auth/audit';
import type { NextRequest } from 'next/server';

const patchSchema = z.object({
  isActive: z.boolean().optional(),
  role: z.enum(['SuperAdmin', 'BranchUser', 'Warehouse', 'Chef']).optional(),
  assignedBranchId: z.string().uuid().nullable().optional(),
}).strict();

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const input = patchSchema.parse(body);

    const [existing] = await db.select().from(schema.users).where(eq(schema.users.id, params.id)).limit(1);
    if (!existing) throw new ApiError(404, 'کاربر یافت نشد', 'NOT_FOUND');

    const [updated] = await db
      .update(schema.users)
      .set(input)
      .where(eq(schema.users.id, params.id))
      .returning();

    if (!updated) throw new ApiError(500, 'خطا در ویرایش کاربر', 'UPDATE_FAILED');

    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined;

    if (typeof input.isActive === 'boolean') {
      await audit({
        action: input.isActive ? 'admin.user.activated' : 'admin.user.suspended',
        userId: admin.sub,
        ip: ip ?? undefined,
        meta: { targetUserId: params.id, targetName: existing.name },
      });
    }
    if (input.role !== undefined) {
      await audit({
        action: 'admin.user.roleChanged',
        userId: admin.sub,
        ip: ip ?? undefined,
        meta: { targetUserId: params.id, from: existing.role, to: input.role },
      });
    }
    if (input.assignedBranchId !== undefined) {
      await audit({
        action: 'admin.user.branchChanged',
        userId: admin.sub,
        ip: ip ?? undefined,
        meta: { targetUserId: params.id, from: existing.assignedBranchId, to: input.assignedBranchId },
      });
    }

    return NextResponse.json({
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        assignedBranch: updated.assignedBranchId,
        isActive: updated.isActive,
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
