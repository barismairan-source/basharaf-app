import { NextResponse } from 'next/server';
import { and, asc, eq, gte, lte } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { ApiError, handleErrorLogged } from '@/lib/api-error';
import { consumeRequestLimit } from '@/lib/auth/rateLimit';
import { todayIsoTehran } from '@/lib/jalali';
import { requireMe } from '@/lib/staff-panel/session';

export const dynamic = 'force-dynamic';
const dateRe = /^\d{4}-\d{2}-\d{2}$/;

/** GET /api/me/shifts?from=&to= — شیفت‌های برنامه‌ریزی‌شده‌ی همین نفر (پیش‌فرض امروز تا ۱۴ روز بعد، حداکثر ۶۰ روز). */
export async function GET(req: Request) {
  try {
    const device = await requireMe();
    const rl = consumeRequestLimit('me-read', device.deviceId, { max: 120, windowMs: 10 * 60 * 1000 });
    if (!rl.allowed) throw new ApiError(429, 'تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره امتحان کنید.', 'RATE_LIMITED');

    const url = new URL(req.url);
    const today = todayIsoTehran();
    const plus = (d: string, n: number) => new Date(Date.parse(d + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
    const from = url.searchParams.get('from') ?? today;
    const to = url.searchParams.get('to') ?? plus(from, 14);
    if (!dateRe.test(from) || !dateRe.test(to) || from > to) throw new ApiError(400, 'بازه نامعتبر است', 'BAD_RANGE');
    if ((Date.parse(to) - Date.parse(from)) / 86400000 > 60) throw new ApiError(400, 'بازه حداکثر ۶۰ روز است', 'RANGE_TOO_LONG');

    const rows = await db.select().from(schema.employeeShiftAssignments)
      .where(and(
        eq(schema.employeeShiftAssignments.employeeId, device.employeeId),
        eq(schema.employeeShiftAssignments.status, 'scheduled'),
        gte(schema.employeeShiftAssignments.workDate, new Date(from + 'T00:00:00Z')),
        lte(schema.employeeShiftAssignments.workDate, new Date(to + 'T00:00:00Z')),
      ))
      .orderBy(asc(schema.employeeShiftAssignments.workDate), asc(schema.employeeShiftAssignments.plannedStartTime));

    return NextResponse.json({
      from, to, today,
      shifts: rows.map((r) => ({
        id: r.id, workDate: r.workDate.toISOString().slice(0, 10),
        startTime: r.plannedStartTime, endTime: r.plannedEndTime, crossesMidnight: r.crossesMidnight,
        plannedMinutes: r.plannedMinutes, breakMinutes: r.breakMinutes, note: r.note,
      })),
    });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
