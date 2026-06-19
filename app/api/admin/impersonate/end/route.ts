import { NextResponse } from 'next/server';
import { requireAdmin, getRealAdminSession } from '@/lib/auth/session';
import { getImpersonationSession, clearImpersonationSession } from '@/lib/auth/impersonation';
import { ApiError, handleError } from '@/lib/api-error';
import { audit } from '@/lib/auth/audit';
import type { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const admin = await getRealAdminSession();
    if (!admin) throw new ApiError(401, 'Unauthorized', 'UNAUTHORIZED');
    if (admin.role !== 'SuperAdmin') throw new ApiError(403, 'Forbidden', 'FORBIDDEN');

    const imp = await getImpersonationSession();
    if (!imp) throw new ApiError(400, 'جلسه جعل هویتی فعال نیست', 'NO_IMP_SESSION');

    clearImpersonationSession();

    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined;
    await audit({
      action: 'admin.impersonation.ended',
      userId: admin.sub,
      ip: ip ?? undefined,
      meta: { targetUserId: imp.sub, targetRole: imp.role },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
