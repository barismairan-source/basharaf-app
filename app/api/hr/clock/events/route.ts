import { NextResponse } from 'next/server';
import { and, asc, eq, gte, lte } from 'drizzle-orm';
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
 * GET /api/hr/clock/events?from=YYYY-MM-DD&to=YYYY-MM-DD&branchId=&employeeId=
 * (یا date=YYYY-MM-DD برای یک روز) — ورود/خروج‌های ثبت‌شده با اینترنت مغازه:
 * هر ورود + خروجِ جفتش + مدت + تأیید Face ID + نتیجه‌ی تبدیل به حضور پیش‌نویس.
 */
export async function GET(req: Request) {
  try {
    const session = await requireSession();
    assertCan(session, 'hr.attendance.view');
    const scope = branchScope(session);
    const url = new URL(req.url);
    const date = url.searchParams.get('date');
    const from = url.searchParams.get('from') ?? date;
    const to = url.searchParams.get('to') ?? date;
    const branchParam = url.searchParams.get('branchId');
    const employeeId = url.searchParams.get('employeeId');
    if (!from || !to || !dateRe.test(from) || !dateRe.test(to)) {
      throw new ApiError(400, 'پارامتر from/to (YYYY-MM-DD) الزامی است', 'MISSING_RANGE');
    }
    if (from > to) throw new ApiError(400, 'تاریخ شروع بعد از تاریخ پایان است', 'BAD_RANGE');
    const days = (Date.parse(to) - Date.parse(from)) / 86400000;
    if (days > 93) throw new ApiError(400, 'بازه حداکثر سه ماه است', 'RANGE_TOO_LONG');
    const branchFilter = scope ?? (branchParam || null);

    const ins = schema.attendanceClockEvents;
    const outs = alias(schema.attendanceClockEvents, 'clock_out_events');
    const rows = await db.select({
      inId: ins.id,
      employeeId: ins.employeeId,
      employeeName: schema.employees.fullName,
      branchId: ins.branchId,
      branchName: schema.branches.name,
      workDate: ins.workDate,
      inAt: ins.occurredAt,
      outAt: outs.occurredAt,
      inVerified: ins.userVerified,
      outVerified: outs.userVerified,
      attendanceEntryId: outs.attendanceEntryId,
      conversionError: outs.conversionError,
    }).from(ins)
      .innerJoin(schema.employees, eq(ins.employeeId, schema.employees.id))
      .innerJoin(schema.branches, eq(ins.branchId, schema.branches.id))
      .leftJoin(outs, eq(outs.pairedInEventId, ins.id))
      .where(and(
        eq(ins.eventType, 'clock_in'),
        gte(ins.workDate, new Date(from + 'T00:00:00Z')),
        lte(ins.workDate, new Date(to + 'T00:00:00Z')),
        branchFilter ? eq(ins.branchId, branchFilter) : undefined,
        employeeId ? eq(ins.employeeId, employeeId) : undefined,
      ))
      .orderBy(asc(ins.occurredAt))
      .limit(5000);

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
          workDate: r.workDate.toISOString().slice(0, 10),
          inAt: r.inAt.toISOString(),
          outAt: r.outAt?.toISOString() ?? null,
          minutes: r.outAt ? Math.floor((r.outAt.getTime() - r.inAt.getTime()) / 60000) : null,
          faceIdVerified: r.outAt ? r.inVerified && !!r.outVerified : r.inVerified,
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
