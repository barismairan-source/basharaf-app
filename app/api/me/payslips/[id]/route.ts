import { NextResponse } from 'next/server';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { ApiError, handleErrorLogged } from '@/lib/api-error';
import { audit } from '@/lib/auth/audit';
import { getClientIp } from '@/lib/auth/rateLimit';
import { requireMe, requireUnlocked } from '@/lib/staff-panel/session';
import { VISIBLE_PAYROLL_STATUSES } from '@/lib/staff-panel/pure';

export const dynamic = 'force-dynamic';

/** GET /api/me/payslips/[id] — جزئیات یک فیش خودِ همین نفر (ردیف‌به‌ردیف). فیش دیگران → ۴۰۴. */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const device = await requireMe();
    await requireUnlocked(device);
    if (!z.string().uuid().safeParse(params.id).success) throw new ApiError(404, 'فیش پیدا نشد', 'NOT_FOUND');
    const [row] = await db.select({
      id: schema.payslips.id, period: schema.payslips.periodYearMonth,
      grossEarnings: schema.payslips.grossEarnings, totalDeductions: schema.payslips.totalDeductions, netPay: schema.payslips.netPay,
      snapshot: schema.payslips.calcSnapshot, runStatus: schema.payrollRuns.status,
    }).from(schema.payslips)
      .innerJoin(schema.payrollRuns, eq(schema.payslips.payrollRunId, schema.payrollRuns.id))
      .where(and(
        eq(schema.payslips.id, params.id),
        eq(schema.payslips.employeeId, device.employeeId),
        inArray(schema.payrollRuns.status, [...VISIBLE_PAYROLL_STATUSES]),
      )).limit(1);
    if (!row) throw new ApiError(404, 'فیش پیدا نشد', 'NOT_FOUND');

    const snap = row.snapshot as { lines?: Array<{ category?: string; labelFa?: string; amount?: number; meta?: { employerCost?: boolean } }> } | null;
    const lines = (snap?.lines ?? [])
      .filter((l) => typeof l.labelFa === 'string' && typeof l.amount === 'number')
      // سهم بیمه‌ی کارفرما از حقوق فرد کم نمی‌شود؛ جدا و فقط «اطلاعاتی» نشان داده می‌شود.
      .map((l) => ({ category: l.category ?? 'other', label: l.labelFa!, amount: l.amount!, employerShare: l.meta?.employerCost === true }));
    void audit({ action: 'staff.payslip.viewed', ip: getClientIp(req), meta: { employeeId: device.employeeId, payslipId: row.id } });
    return NextResponse.json({
      payslip: {
        id: row.id, period: row.period, paid: row.runStatus === 'posted',
        grossEarnings: Number(row.grossEarnings), totalDeductions: Number(row.totalDeductions), netPay: Number(row.netPay), lines,
      },
    });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
