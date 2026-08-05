import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleErrorLogged } from '@/lib/api-error';
import { computePayrollReadiness } from '@/lib/payroll/payrollReadiness';

export const dynamic = 'force-dynamic';

const periodRe = /^\d{4}-\d{2}$/;

/**
 * GET /api/hr/payroll/readiness?period=1405-05&branchId=...
 * آمادگی محاسبه/تأیید حقوق یک دوره — قبل از calculate/approve چک شود.
 */
export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const period = url.searchParams.get('period');
    const branchId = url.searchParams.get('branchId');
    if (!period || !periodRe.test(period)) {
      throw new ApiError(400, 'پارامتر period (YYYY-MM) الزامی است', 'MISSING_PERIOD');
    }
    const result = await computePayrollReadiness(period, branchId ?? undefined);
    return NextResponse.json(result);
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
