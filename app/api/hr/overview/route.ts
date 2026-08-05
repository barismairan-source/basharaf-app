import { NextResponse } from 'next/server';
import { and, eq, gte, lte, inArray, isNull } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { handleErrorLogged } from '@/lib/api-error';
import { computeReadinessForEmployees } from '@/lib/payroll/payrollReadiness';
import { getTodayJalali } from '@/lib/jalali';

export const dynamic = 'force-dynamic';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function currentPeriodYearMonth(): string {
  const [jy, jm] = getTodayJalali().split('/');
  return `${jy}-${jm}`;
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * GET /api/hr/overview?branchId=...
 * خلاصه‌ی «نیازمند اقدام» + شاخص‌های نمای کلی منابع انسانی — یک درخواست
 * واحد به‌جای فچ جداگانه برای هر کارت.
 */
export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const url = new URL(req.url);
    const branchIdParam = url.searchParams.get('branchId');
    const branchId = session.role === 'BranchUser' ? (session.branchId ?? null) : (branchIdParam || null);

    const today = todayIso();
    const period = currentPeriodYearMonth();
    const expirySoon = addDaysIso(today, 30);

    const empWhere = branchId
      ? and(eq(schema.employees.isActive, true), eq(schema.employees.branchId, branchId))
      : eq(schema.employees.isActive, true);
    const employees = await db.select().from(schema.employees).where(empWhere);
    const empIds = employees.map(e => e.id);
    const hourlyEmpIds = employees.filter(e => e.compensationType === 'hourly').map(e => e.id);

    // ── استخدام ──
    const [newApplicantsRows, shortlistRows] = await Promise.all([
      db.select({ id: schema.jobApplications.id }).from(schema.jobApplications).where(eq(schema.jobApplications.status, 'new')),
      db.select({ id: schema.jobApplications.id }).from(schema.jobApplications).where(eq(schema.jobApplications.status, 'shortlist')),
    ]);

    // ── شیفت/حضور امروز ──
    const todaysAssignments = empIds.length > 0
      ? await db.select().from(schema.employeeShiftAssignments).where(and(
          inArray(schema.employeeShiftAssignments.employeeId, empIds),
          eq(schema.employeeShiftAssignments.workDate, new Date(today + 'T00:00:00Z')),
          eq(schema.employeeShiftAssignments.status, 'scheduled'),
        ))
      : [];
    const todaysAttendance = empIds.length > 0
      ? await db.select().from(schema.attendanceEntries).where(and(
          inArray(schema.attendanceEntries.employeeId, empIds),
          eq(schema.attendanceEntries.workDate, new Date(today + 'T00:00:00Z')),
        ))
      : [];
    const employeesWithShiftToday = new Set(todaysAssignments.map(a => a.employeeId));
    const peopleWithoutShiftToday = hourlyEmpIds.filter(id => !employeesWithShiftToday.has(id)).length;
    const assignmentIdsWithAttendance = new Set(todaysAttendance.map(e => e.shiftAssignmentId).filter(Boolean));
    const unrecordedAttendanceToday = todaysAssignments.filter(a => !assignmentIdsWithAttendance.has(a.id)).length;
    const plannedMinutesToday = todaysAssignments.reduce((s, a) => s + a.plannedMinutes, 0);
    const workedMinutesToday = todaysAttendance.reduce((s, e) => s + e.workedMinutes, 0);

    // ── آمادگی حقوق دوره‌ی جاری (بازاستفاده از موتور فاز ۱) ──
    const readiness = await computeReadinessForEmployees(employees, period, branchId);

    // ── مدارک نزدیک انقضا (۳۰ روز آینده) ──
    const expiringDocs = empIds.length > 0
      ? await db.select({ id: schema.employeeDocuments.id }).from(schema.employeeDocuments).where(and(
          inArray(schema.employeeDocuments.employeeId, empIds),
          gte(schema.employeeDocuments.expiryDate, new Date(today + 'T00:00:00Z')),
          lte(schema.employeeDocuments.expiryDate, new Date(expirySoon + 'T00:00:00Z')),
        ))
      : [];

    // ── وضعیت اجرای حقوق دوره‌ی جاری (اگر ساخته شده) ──
    const [payrollRun] = await db.select().from(schema.payrollRuns).where(and(
      eq(schema.payrollRuns.periodYearMonth, period),
      branchId ? eq(schema.payrollRuns.branchId, branchId) : isNull(schema.payrollRuns.branchId),
    )).limit(1);

    return NextResponse.json({
      period,
      actionNeeded: {
        newApplicants: newApplicantsRows.length,
        applicantsAwaitingReview: shortlistRows.length,
        peopleWithoutShiftToday,
        unrecordedAttendanceToday,
        draftAttendanceCount: readiness.draftAttendanceCount,
        suspiciousAttendanceDays: readiness.overlappingAttendanceDays.length,
        unscheduledAttendanceCount: readiness.unscheduledAttendanceCount,
        unapprovedOvertimeCount: readiness.unapprovedOvertimeCount,
        documentsExpiringSoon: expiringDocs.length,
        employeesWithInvalidRate: readiness.employeesWithInvalidRate.length,
        payrollNotReady: !readiness.ready,
        payrollReadyToAct: readiness.ready && !!payrollRun && (payrollRun.status === 'draft' || payrollRun.status === 'calculated'),
      },
      metrics: {
        activeEmployeeCount: employees.length,
        hourlyEmployeeCount: hourlyEmpIds.length,
        newApplicantsCount: newApplicantsRows.length,
        plannedMinutesToday,
        workedMinutesToday,
        unapprovedOvertimeCount: readiness.unapprovedOvertimeCount,
        payrollReady: readiness.ready,
        payrollRunStatus: payrollRun?.status ?? null,
      },
    });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
