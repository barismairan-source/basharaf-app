import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';
import { listBoardOrders } from '@/lib/ordering/orders';

export const dynamic = 'force-dynamic';

/**
 * GET /api/orders?branchId=<uuid>
 *
 * تخته‌ی عملیاتی پرسنل — سفارش‌های امروز + هر سفارش بازِ روزهای قبل.
 * - SuperAdmin: می‌تواند branchId بدهد (همه‌ی شعب اگر ندهد).
 * - BranchUser: همیشه scope به شعبه‌ی خودش (پارامتر branchId نادیده گرفته می‌شود).
 */
export async function GET(req: Request) {
  try {
    const session = await requireRole('SuperAdmin', 'BranchUser');
    const url = new URL(req.url);
    const branchIdParam = url.searchParams.get('branchId');

    const branchId = session.role === 'BranchUser' ? session.branchId ?? undefined : branchIdParam ?? undefined;

    const orders = await listBoardOrders({ branchId });
    return NextResponse.json({ orders });
  } catch (e) {
    return handleError(e);
  }
}
