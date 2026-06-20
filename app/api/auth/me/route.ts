import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';

/**
 * GET /api/auth/me
 *
 * Response: { user: { id, name, email, role, assignedBranch, ... } }
 *
 * استفاده در client: برای بازیابی session بعد از refresh.
 * هنگامی که AppShell mount می‌شود، این را call می‌کنیم تا state authSlice
 * را restore کنیم (به‌جای persist).
 */
export async function GET() {
  try {
    const session = await requireSession();

    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, session.sub))
      .limit(1);

    if (!user) {
      throw new ApiError(401, 'کاربر پیدا نشد', 'USER_NOT_FOUND');
    }

    if (!user.isActive) {
      throw new ApiError(401, 'حساب کاربری شما غیرفعال شده است', 'ACCOUNT_INACTIVE');
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        assignedBranch: user.assignedBranchId,
        initials: user.initials,
        lastSeen: user.lastSeen,
        joined: user.joined,
        permissions: user.permissions ?? null,
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
