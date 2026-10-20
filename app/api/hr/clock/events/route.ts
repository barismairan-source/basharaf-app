import { NextResponse } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { assertCan, branchScope } from '@/lib/auth/apiAccess';
import { ApiError, handleErrorLogged } from '@/lib/api-error';
import { MAX_OPEN_SHIFT_HOURS } from '@/lib/attendance-clock/rules';
import { CONVERSION_ERROR_LABELS } from '@/lib/attendance-clock/service';

export const dynamic = 'force-dynamic';

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/hr/clock/events?date=YYYY-MM-DD&branchId= — ورود/خروج‌های ثبت‌شده با
 * اینترنت مغازه در یک روز کاری: هر ورود + خروجِ جفتش + نتیجه‌ی تبدیل به حضور پیش‌نویس.
 */
export async function GET(req: Request) {
  try {
    const session = await requireSession();
    assertCan(session, 'hr.attendance.view');
    const scope = branchScope(session);
    const url = new URL(req.url);
    const date = url.searchParams.get('date');
    const branchParam = url.searchParams.get('branchId');
    if (!date || !dateRe.test(date)) throw new ApiError(400, 'پارامتر date (YYYY-MM-DD) الزامی است', 'MISSING_DATE');
    const branchFilter = scope ?? (branchParam || null);

    const ins = schema.attendanceClockEvents;
    const outs = alias(schema.attendanceClockEvents, 'clock_out_events');
    const rows = await db.select({
      inId: ins.id,
      employeeId: ins.employeeId,
      employeeName: schema.employees.fullName,
      branchId: ins.branchId,
      branchName: schema.branches.name,
      inAt: ins.occurredAt,
      outAt: outs.occurredAt,
      attendanceEntryId: outs.attendanceEntryId,
      conversionError: outs.conversionError,
    }).from(ins)
      .innerJoin(schema.employees, eq(ins.employeeId, schema.employees.id))
      .innerJoin(schema.branches, eq(ins.branchId, schema.branches.id))
      .leftJoin(outs, eq(outs.pairedInEventId, ins.id))
      .where(and(
        eq(ins.eventType, 'clock_in'),
        eq(ins.workDate, new Date(date + 'T00:00:00Z')),
        branchFilter ? eq(ins.branchId, branchFilter) : undefined,
      ))
      .orderBy(asc(ins.occurredAt));

    const now = Date.now();
    return NextResponse.json({
      sessions: rows.map((r) => {
        const open = !r.outAt;
        const stale = open && now - r.inAt.getTime() > MAX_OPEN_SHIFT_HOURS * 3600_000;
        return {
          id: r.inId,
          employeeId: r.employeeId,
          employeeName: r.employeeName,
          branchId: r.branchId,
          branchName: r.branchName,
          inAt: r.inAt.toISOString(),
          outAt: r.outAt?.toISOString() ?? null,
          status: open ? (stale ? 'incomplete' : 'present') : (r.attendanceEntryId ? 'converted' : 'needs_review'),
          attendanceEntryId: r.attendanceEntryId,
          conversionError: r.conversionError ? (CONVERSION_ERROR_LABELS[r.conversionError] ?? r.conversionError) : null,
        };
      }),
    });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
