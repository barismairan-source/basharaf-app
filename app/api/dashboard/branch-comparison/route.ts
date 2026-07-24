import { NextResponse } from 'next/server';
import { requireSession, ForbiddenError } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';
import { getBranchCogsWaste } from '@/lib/reports/periodReport';
import { isValidJalaliString } from '@/lib/jalali';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/branch-comparison?from=<jalali>&to=<jalali>
 *
 * COGS تخمینی و ضایعات به‌تفکیک شعبه برای یک بازه — مکمل `byBranch` که
 * `/api/reports` از قبل برای income/expense/balance برمی‌گرداند (آن دو
 * ستون را ندارد). صفحه‌ی داشبورد این دو پاسخ را با branchId ادغام می‌کند.
 *
 * فقط SuperAdmin — مقایسه‌ی بین‌شعبه‌ای ذاتاً یک نمای مدیریتی است؛
 * BranchUser/Warehouse/Chef فقط یک شعبه دارند و چیزی برای مقایسه نیست.
 */
export async function GET(req: Request) {
  try {
    const session = await requireSession();
    if (session.role !== 'SuperAdmin') throw new ForbiddenError();

    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!from || !to || !isValidJalaliString(from) || !isValidJalaliString(to)) {
      return NextResponse.json({ error: 'from/to نامعتبر است' }, { status: 400 });
    }

    const rows = await getBranchCogsWaste({ fromJalali: from, toJalali: to });
    return NextResponse.json({ from, to, branches: rows });
  } catch (e) {
    return handleError(e);
  }
}
