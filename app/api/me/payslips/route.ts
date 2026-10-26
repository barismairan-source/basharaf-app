import { NextResponse } from 'next/server';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { handleErrorLogged } from '@/lib/api-error';
import { requireMe, requireUnlocked } from '@/lib/staff-panel/session';
import { VISIBLE_PAYROLL_STATUSES } from '@/lib/staff-panel/pure';

export const dynamic = 'force-dynamic';

/** GET /api/me/payslips — فیش‌های همین نفر (فقط دوره‌های تأییدشده‌ی مدیر). نیاز به قفل Face ID باز. */
export async function GET(req: Request) {
  try {
    const device = await requireMe();
    await requireUnlocked(device);
    const rows = await db.select({
      id: schema.payslips.id,
      period: schema.payslips.periodYearMonth,
      grossEarnings: schema.payslips.grossEarnings,
      totalDeductions: schema.payslips.totalDeductions,
      netPay: schema.payslips.netPay,
      runStatus: schema.payrollRuns.status,
    }).from(schema.payslips)
      .innerJoin(schema.payrollRuns, eq(schema.payslips.payrollRunId, schema.payrollRuns.id))
      .where(and(
        eq(schema.payslips.employeeId, device.employeeId),
        inArray(schema.payrollRuns.status, [...VISIBLE_PAYROLL_STATUSES]),
      ))
      .orderBy(desc(schema.payslips.periodYearMonth))
      .limit(24);
    return NextResponse.json({
      payslips: rows.map((r) => ({
        id: r.id, period: r.period, grossEarnings: Number(r.grossEarnings), totalDeductions: Number(r.totalDeductions),
        netPay: Number(r.netPay), paid: r.runStatus === 'posted',
      })),
    });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
