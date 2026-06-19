import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { setImpersonationSession } from '@/lib/auth/impersonation';
import { ApiError, handleError } from '@/lib/api-error';
import { audit } from '@/lib/auth/audit';
import type { NextRequest } from 'next/server';

const bodySchema = z.object({ targetUserId: z.string().uuid() });

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const { targetUserId } = bodySchema.parse(await req.json());

    if (targetUserId === admin.sub) {
      throw new ApiError(400, 'نمی‌توانید خودتان را جعل هویت کنید', 'SELF_IMPERSONATE');
    }

    const [target] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, targetUserId))
      .limit(1);
    if (!target) throw new ApiError(404, 'کاربر یافت نشد', 'NOT_FOUND');
    if (!target.isActive) throw new ApiError(403, 'کاربر غیرفعال است', 'USER_INACTIVE');

    await setImpersonationSession({
      sub: target.id,
      targetName: target.name,
      role: target.role,
      branchId: target.assignedBranchId,
      permissions: target.permissions ?? null,
      impersonatedBy: admin.sub,
    });

    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined;
    await audit({
      action: 'admin.impersonation.started',
      userId: admin.sub,
      ip: ip ?? undefined,
      meta: { targetUserId: target.id, targetName: target.name, targetRole: target.role },
    });

    return NextResponse.json({ ok: true, targetName: target.name });
  } catch (e) {
    return handleError(e);
  }
}
