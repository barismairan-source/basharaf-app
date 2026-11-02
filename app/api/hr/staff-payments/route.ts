import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { assertBranch, assertCan } from '@/lib/auth/apiAccess';
import { ApiError, handleErrorLogged } from '@/lib/api-error';
import { sortPayments, type PaymentKind } from '@/lib/staff-panel/payments';

export const dynamic = 'force-dynamic';

/**
 * GET /api/hr/staff-payments?employeeId= — تاریخچه‌ی واریزی‌های یک نفر برای مدیر؛
 * همان فهرستی که خود فرد در پنلش می‌بیند. فقط با hr.compensation.view و محدوده‌ی شعبه.
 */
export async function GET(req: Request) {
  try {
    const session = await requireSession();
    assertCan(session, 'hr.compensation.view');
    const employeeId = new URL(req.url).searchParams.get('employeeId') ?? '';
    if (!z.string().uuid().safeParse(employeeId).success) throw new ApiError(404, 'پیدا نشد', 'NOT_FOUND');
    const [emp] = await db.select({ branchId: schema.employees.branchId, fullName: schema.employees.fullName })
      .from(schema.employees).where(eq(schema.employees.id, employeeId)).limit(1);
    if (!emp) throw new ApiError(404, 'پیدا نشد', 'NOT_FOUND');
    assertBranch(session, emp.branchId);
    const rows = await db.select({
      id: schema.staffPayments.id, period: schema.staffPayments.periodYearMonth, kind: schema.staffPayments.kind,
      amount: schema.staffPayments.amount, paidOn: schema.staffPayments.paidOn, title: schema.staffPayments.title,
      hasReceipt: schema.staffPayments.hasReceipt,
    }).from(schema.staffPayments)
      .where(eq(schema.staffPayments.employeeId, employeeId)).limit(200);
    return NextResponse.json({
      fullName: emp.fullName,
      payments: sortPayments(rows.map((r) => ({ ...r, kind: r.kind as PaymentKind, amount: Number(r.amount) }))),
    });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
