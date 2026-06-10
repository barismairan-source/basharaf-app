import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { verifyToken } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/permissions
 *
 * بخشی از راهکار «اعمال فوری تغییر دسترسی»:
 * permissions در JWT baked می‌شود و فقط با ورود بعدی به‌روز می‌شد. این route
 * یک منبع سبک و تازه از DB برمی‌گرداند که middleware (Edge runtime — بدون
 * دسترسی مستقیم به driver postgres) با cache کوتاه‌مدت (`revalidate`) صدا
 * می‌زند تا بدون نیاز به re-login، تغییرات تقریباً فوری اعمال شوند.
 *
 * طراحی عمداً حداقلی است: فقط role + permissions + branchId برمی‌گرداند،
 * نه یک session کامل. اگر کاربر حذف/غیرفعال شده باشد، 404 می‌دهد تا middleware
 * بتواند session را باطل کند.
 */
export async function GET(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return NextResponse.json({ error: 'NO_TOKEN' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'INVALID_TOKEN' }, { status: 401 });

    const [user] = await db.select({
      id: schema.users.id,
      role: schema.users.role,
      branchId: schema.users.assignedBranchId,
      permissions: schema.users.permissions,
    }).from(schema.users).where(eq(schema.users.id, payload.sub)).limit(1);

    if (!user) {
      return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({
      role: user.role,
      branchId: user.branchId,
      permissions: user.permissions ?? null,
    }, {
      headers: {
        // برای fetch سمت middleware: کش کوتاه (چند ثانیه) — تعادل بین «فوری بودن»
        // و فشار روی DB در هر request محافظت‌شده.
        'Cache-Control': 'private, max-age=5',
      },
    });
  } catch {
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 });
  }
}
