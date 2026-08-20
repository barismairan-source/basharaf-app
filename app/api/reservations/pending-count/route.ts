import { NextResponse } from 'next/server';
import { and, eq, count } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';

/** GET /api/reservations/pending-count — برای badge سایدبار، سبک (فقط عدد). */
export async function GET() {
  try {
    const session = await requireSession();
    if (session.role === 'Warehouse' || session.role === 'Chef') {
      throw new ApiError(403, 'دسترسی ندارید', 'FORBIDDEN');
    }
    if (session.role !== 'SuperAdmin' && !session.branchId) {
      return NextResponse.json({ count: 0 });
    }

    const where = session.role === 'SuperAdmin'
      ? eq(schema.reservations.status, 'pending')
      : and(eq(schema.reservations.status, 'pending'), eq(schema.reservations.branchId, session.branchId as string));

    const [row] = await db.select({ count: count() }).from(schema.reservations).where(where);
    return NextResponse.json({ count: row?.count ?? 0 });
  } catch (e) {
    return handleError(e);
  }
}
