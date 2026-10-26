import { NextResponse } from 'next/server';
import { and, asc, eq, gte, lte } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { ApiError, handleErrorLogged } from '@/lib/api-error';
import { consumeRequestLimit } from '@/lib/auth/rateLimit';
import { getTodayJalali, jalaliMonthRange } from '@/lib/jalali';
import { requireMe } from '@/lib/staff-panel/session';
import { isValidPeriod, summarizeAttendance, toLatinDigits } from '@/lib/staff-panel/pure';

export const dynamic = 'force-dynamic';

/**
 * GET /api/me/attendance?period=YYYY-MM (شمسی) — حضور خودِ همین نفر در یک ماه.
 * فقط ساعت‌ها و وضعیت؛ نرخ ساعتی، مبلغ و یادداشت مدیر هرگز برنگردانده می‌شوند.
 */
export async function GET(req: Request) {
  try {
    const device = await requireMe();
    const rl = consumeRequestLimit('me-read', device.deviceId, { max: 120, windowMs: 10 * 60 * 1000 });
    if (!rl.allowed) throw new ApiError(429, 'تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره امتحان کنید.', 'RATE_LIMITED');

    const requested = new URL(req.url).searchParams.get('period');
    const [jy, jm] = toLatinDigits(getTodayJalali()).split('/');
    const period = isValidPeriod(requested) ? requested : `${jy}-${jm}`;
    const range = jalaliMonthRange(period);
    if (!range) throw new ApiError(400, 'دوره نامعتبر است', 'BAD_PERIOD');

    const rows = await db.select().from(schema.attendanceEntries)
      .where(and(
        eq(schema.attendanceEntries.employeeId, device.employeeId),
        gte(schema.attendanceEntries.workDate, new Date(range.from + 'T00:00:00Z')),
        lte(schema.attendanceEntries.workDate, new Date(range.to + 'T00:00:00Z')),
      ))
      .orderBy(asc(schema.attendanceEntries.workDate), asc(schema.attendanceEntries.clockIn));

    const entries = rows.map((r) => ({
      id: r.id,
      workDate: r.workDate.toISOString().slice(0, 10),
      clockIn: r.clockIn, clockOut: r.clockOut,
      workedMinutes: r.workedMinutes,
      overtimeMinutes: r.overtimeMinutes, overtimeApproved: r.overtimeApproved,
      attendanceType: r.attendanceType,
      status: r.status,
    }));
    return NextResponse.json({ period, entries, summary: summarizeAttendance(entries) });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
