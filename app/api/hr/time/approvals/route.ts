import { NextResponse } from 'next/server';
import { and, eq, gte, lte, inArray } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleErrorLogged } from '@/lib/api-error';
import { jalaliMonthRange } from '@/lib/jalali';
import { findAttendanceOverlap, type AttendanceIntervalInput } from '@/lib/payroll/attendanceEngine';

export const dynamic = 'force-dynamic';

const periodRe = /^\d{4}-\d{2}$/;

function toDateStr(d: Date): string { return d.toISOString().slice(0, 10); }

/**
 * GET /api/hr/time/approvals?period=1405-05&branchId=...
 * صف واحد بررسی — حضور draft، اضافه‌کاری تأییدنشده، حضور بدون شیفت، حضور
 * هم‌پوشان، همه در یک درخواست (نه ۴ صفحه‌ی جدا). فقط مدیر کل (تأیید حضور/
 * اضافه‌کاری طبق مدل دسترسی فاز ۲ فقط برای مدیر کل است).
 */
export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const period = url.searchParams.get('period');
    const branchId = url.searchParams.get('branchId');
    if (!period || !periodRe.test(period)) throw new ApiError(400, 'پارامتر period (YYYY-MM) الزامی است', 'MISSING_PERIOD');
    const range = jalaliMonthRange(period);
    if (!range) throw new ApiError(400, 'فرمت دوره نامعتبر است', 'BAD_PERIOD');

    const empWhere = branchId
      ? and(eq(schema.employees.isActive, true), eq(schema.employees.branchId, branchId))
      : eq(schema.employees.isActive, true);
    const employees = await db.select().from(schema.employees).where(empWhere);
    const empIds = employees.filter(e => e.compensationType === 'hourly').map(e => e.id);
    const empNameById = new Map(employees.map(e => [e.id, e.fullName]));

    if (empIds.length === 0) {
      return NextResponse.json({ draftEntries: [], unapprovedOvertimeEntries: [], unscheduledEntries: [], overlappingDays: [] });
    }

    const rows = await db.select({
      entry: schema.attendanceEntries,
      assignmentStartTime: schema.employeeShiftAssignments.plannedStartTime,
      assignmentEndTime: schema.employeeShiftAssignments.plannedEndTime,
      assignmentCrossesMidnight: schema.employeeShiftAssignments.crossesMidnight,
    }).from(schema.attendanceEntries)
      .leftJoin(schema.employeeShiftAssignments, eq(schema.attendanceEntries.shiftAssignmentId, schema.employeeShiftAssignments.id))
      .where(and(
        inArray(schema.attendanceEntries.employeeId, empIds),
        gte(schema.attendanceEntries.workDate, new Date(range.from + 'T00:00:00Z')),
        lte(schema.attendanceEntries.workDate, new Date(range.to + 'T00:00:00Z')),
      ));

    function serialize(r: (typeof rows)[number]) {
      return {
        id: r.entry.id, employeeId: r.entry.employeeId, employeeName: empNameById.get(r.entry.employeeId) ?? '—',
        workDate: toDateStr(r.entry.workDate), workedMinutes: r.entry.workedMinutes,
        overtimeMinutes: r.entry.overtimeMinutes, status: r.entry.status,
        attendanceType: r.entry.attendanceType, shiftAssignmentId: r.entry.shiftAssignmentId,
      };
    }

    const draftEntries = rows.filter(r => r.entry.status === 'draft').map(serialize);
    const unapprovedOvertimeEntries = rows.filter(r => r.entry.overtimeMinutes > 0 && !r.entry.overtimeApproved).map(serialize);
    const unscheduledEntries = rows.filter(r => r.entry.shiftAssignmentId === null && r.entry.attendanceType === 'present').map(serialize);

    const byEmployeeDay = new Map<string, typeof rows>();
    for (const r of rows) {
      const key = `${r.entry.employeeId}|${toDateStr(r.entry.workDate)}`;
      const list = byEmployeeDay.get(key) ?? [];
      list.push(r);
      byEmployeeDay.set(key, list);
    }
    const overlappingDays: Array<{ employeeId: string; employeeName: string; workDate: string; entryIds: string[] }> = [];
    for (const [key, group] of byEmployeeDay) {
      if (group.length < 2) continue;
      const [employeeId, workDate] = key.split('|') as [string, string];
      const intervals: AttendanceIntervalInput[] = group.map(r => ({
        id: r.entry.id, attendanceType: r.entry.attendanceType, entryMode: r.entry.entryMode,
        clockIn: r.entry.clockIn, clockOut: r.entry.clockOut, crossesMidnight: false,
        shiftAssignmentId: r.entry.shiftAssignmentId,
        assignmentStartTime: r.assignmentStartTime, assignmentEndTime: r.assignmentEndTime,
        assignmentCrossesMidnight: r.assignmentCrossesMidnight ?? false,
      }));
      if (intervals.some(candidate => findAttendanceOverlap(candidate, intervals))) {
        overlappingDays.push({ employeeId, employeeName: empNameById.get(employeeId) ?? '—', workDate, entryIds: group.map(r => r.entry.id) });
      }
    }

    return NextResponse.json({ draftEntries, unapprovedOvertimeEntries, unscheduledEntries, overlappingDays });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
