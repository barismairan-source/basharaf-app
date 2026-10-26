import { NextResponse } from 'next/server';
import { and, asc, eq, gte, inArray, isNull, lte } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { assertCan, branchScope } from '@/lib/auth/apiAccess';
import { canDo } from '@/lib/auth/permissions';
import { ApiError, handleErrorLogged } from '@/lib/api-error';
import { getTodayJalali, jalaliMonthRange } from '@/lib/jalali';
import { DEFAULT_ROLES } from '@/types/payroll';
import { isValidPeriod, sectionOfRole, summarizeAttendance, toLatinDigits } from '@/lib/staff-panel/pure';
import { clockStateFrom } from '@/lib/attendance-clock/rules';

export const dynamic = 'force-dynamic';

/**
 * GET /api/hr/staff-overview?period=YYYY-MM&branchId= — نمای مدیر از همه‌ی پرسنل:
 * بخش، وضعیت پنل (لینک/گوشی/Face ID)، الان داخل است یا نه، حضور ماه (تأییدشده/منتظر)، و — فقط با
 * مجوز hr.compensation.view — نرخ و حقوق و جمع ریز کارکرد ماه. مدیر شعبه فقط شعبه‌ی خودش را می‌بیند.
 */
export async function GET(req: Request) {
  try {
    const session = await requireSession();
    assertCan(session, 'hr.attendance.view');
    const scope = branchScope(session);
    const canSeePay = canDo(session, 'hr.compensation.view');
    const url = new URL(req.url);
    const requested = url.searchParams.get('period');
    const [jy, jm] = toLatinDigits(getTodayJalali()).split('/');
    const period = isValidPeriod(requested) ? requested : `${jy}-${jm}`;
    const range = jalaliMonthRange(period);
    if (!range) throw new ApiError(400, 'دوره نامعتبر است', 'BAD_PERIOD');
    const branchFilter = scope ?? (url.searchParams.get('branchId') || null);

    const people = await db.select({
      id: schema.employees.id, fullName: schema.employees.fullName, role: schema.employees.role,
      branchId: schema.employees.branchId, compensationType: schema.employees.compensationType,
      baseMonthlySalary: schema.employees.baseMonthlySalary, phone: schema.employees.phone,
    }).from(schema.employees)
      .where(and(eq(schema.employees.isActive, true), branchFilter ? eq(schema.employees.branchId, branchFilter) : undefined))
      .orderBy(asc(schema.employees.fullName));
    const ids = people.map((p) => p.id);
    if (ids.length === 0) return NextResponse.json({ period, canSeePay, people: [] });

    const [entries, devices, opens, statements, rates] = await Promise.all([
      db.select({ employeeId: schema.attendanceEntries.employeeId, status: schema.attendanceEntries.status, attendanceType: schema.attendanceEntries.attendanceType, workedMinutes: schema.attendanceEntries.workedMinutes })
        .from(schema.attendanceEntries)
        .where(and(inArray(schema.attendanceEntries.employeeId, ids),
          gte(schema.attendanceEntries.workDate, new Date(range.from + 'T00:00:00Z')), lte(schema.attendanceEntries.workDate, new Date(range.to + 'T00:00:00Z')))),
      db.select({ employeeId: schema.attendanceClockDevices.employeeId, activatedAt: schema.attendanceClockDevices.activatedAt, passkey: schema.attendanceClockDevices.passkeyCredentialId, exempt: schema.attendanceClockDevices.faceIdExempt, lastUsedAt: schema.attendanceClockDevices.lastUsedAt })
        .from(schema.attendanceClockDevices)
        .where(and(inArray(schema.attendanceClockDevices.employeeId, ids), isNull(schema.attendanceClockDevices.revokedAt))),
      // آخرین ورودِ هر نفر در ۲ روز اخیر (برای «الان داخل است؟»)
      db.select({ id: schema.attendanceClockEvents.id, employeeId: schema.attendanceClockEvents.employeeId, eventType: schema.attendanceClockEvents.eventType, occurredAt: schema.attendanceClockEvents.occurredAt, paired: schema.attendanceClockEvents.pairedInEventId })
        .from(schema.attendanceClockEvents)
        .where(and(inArray(schema.attendanceClockEvents.employeeId, ids), gte(schema.attendanceClockEvents.occurredAt, new Date(Date.now() - 2 * 86400000)))),
      canSeePay
        ? db.select({ id: schema.staffStatements.id, employeeId: schema.staffStatements.employeeId, total: schema.staffStatements.totalAmount, model: schema.staffStatements.model })
          .from(schema.staffStatements)
          .where(and(inArray(schema.staffStatements.employeeId, ids), eq(schema.staffStatements.periodYearMonth, period)))
        : Promise.resolve([] as Array<{ id: string; employeeId: string; total: number; model: string }>),
      canSeePay
        ? db.select({ employeeId: schema.employeeHourlyRates.employeeId, hourlyRate: schema.employeeHourlyRates.hourlyRate, effectiveFrom: schema.employeeHourlyRates.effectiveFrom, effectiveTo: schema.employeeHourlyRates.effectiveTo })
          .from(schema.employeeHourlyRates).where(inArray(schema.employeeHourlyRates.employeeId, ids))
        : Promise.resolve([] as Array<{ employeeId: string; hourlyRate: number; effectiveFrom: Date; effectiveTo: Date | null }>),
    ]);

    const now = new Date();
    const todayIso = now.toISOString().slice(0, 10);
    return NextResponse.json({
      period, canSeePay,
      people: people.map((p) => {
        const dev = devices.find((d) => d.employeeId === p.id);
        const myEvents = opens.filter((e) => e.employeeId === p.id);
        const lastIn = myEvents.filter((e) => e.eventType === 'clock_in').sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())[0];
        const closed = lastIn && myEvents.some((e) => e.paired === lastIn.id);
        const state = clockStateFrom(lastIn && !closed ? { id: lastIn.id, occurredAt: lastIn.occurredAt } : null, now);
        const st = statements.find((s) => s.employeeId === p.id);
        const rate = rates.filter((r) => r.employeeId === p.id && r.effectiveFrom.toISOString().slice(0, 10) <= todayIso && (!r.effectiveTo || r.effectiveTo.toISOString().slice(0, 10) >= todayIso))
          .sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime())[0];
        const roleLabel = DEFAULT_ROLES.find((r) => r.value === p.role)?.label ?? p.role;
        return {
          id: p.id, fullName: p.fullName, section: sectionOfRole(p.role, roleLabel), branchId: p.branchId,
          compensationType: p.compensationType,
          panel: !dev ? 'none' : dev.activatedAt ? 'active' : 'pending',
          faceId: dev?.exempt ? 'exempt' : dev?.passkey ? 'on' : 'off',
          lastUsedAt: dev?.lastUsedAt?.toISOString() ?? null,
          inNow: state.kind === 'in', inSince: state.kind === 'in' ? state.since.toISOString() : null,
          attendance: summarizeAttendance(entries.filter((e) => e.employeeId === p.id)),
          ...(canSeePay ? {
            hourlyRate: rate ? Number(rate.hourlyRate) : null,
            baseMonthlySalary: Number(p.baseMonthlySalary) > 0 ? Number(p.baseMonthlySalary) : null,
            statement: st ? { id: st.id, total: Number(st.total), model: st.model } : null,
          } : {}),
        };
      }),
    });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
