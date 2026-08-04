import { NextResponse } from 'next/server';
import { eq, and, gte, lte } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession, requireRole } from '@/lib/auth/session';
import { ApiError, handleErrorLogged } from '@/lib/api-error';
import { computeDerivedFields } from '@/lib/payroll/attendanceEntryHelpers';

export const dynamic = 'force-dynamic';

const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const timeRe = /^([0-1]?\d|2[0-3]):([0-5]\d)$/;

function toDate(s: string): Date { return new Date(s + 'T00:00:00Z'); }
function toDateStr(d: Date): string { return d.toISOString().slice(0, 10); }

function rowToEntry(row: typeof schema.attendanceEntries.$inferSelect, employeeName?: string | null) {
  return {
    id: row.id, employeeId: row.employeeId, employeeName: employeeName ?? null,
    branchId: row.branchId, workDate: toDateStr(row.workDate),
    shiftAssignmentId: row.shiftAssignmentId,
    entryMode: row.entryMode, clockIn: row.clockIn, clockOut: row.clockOut,
    manualWorkedMinutes: row.manualWorkedMinutes, breakMinutes: row.breakMinutes,
    workedMinutes: row.workedMinutes, regularMinutes: row.regularMinutes,
    overtimeMinutes: row.overtimeMinutes, overtimeApproved: row.overtimeApproved,
    nightMinutes: row.nightMinutes, holidayMinutes: row.holidayMinutes,
    hourlyRateSnapshot: Number(row.hourlyRateSnapshot),
    status: row.status, attendanceType: row.attendanceType, managerNote: row.managerNote,
    confirmedAt: row.confirmedAt?.toISOString() ?? null, lockedAt: row.lockedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const url = new URL(req.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const branchIdParam = url.searchParams.get('branchId');
    const employeeId = url.searchParams.get('employeeId');
    if (!from || !to || !dateRe.test(from) || !dateRe.test(to)) {
      throw new ApiError(400, 'پارامتر from/to (YYYY-MM-DD) الزامی است', 'MISSING_RANGE');
    }

    const clauses = [gte(schema.attendanceEntries.workDate, toDate(from)), lte(schema.attendanceEntries.workDate, toDate(to))];
    if (session.role === 'BranchUser' && session.branchId) {
      clauses.push(eq(schema.attendanceEntries.branchId, session.branchId));
    } else if (branchIdParam) {
      clauses.push(eq(schema.attendanceEntries.branchId, branchIdParam));
    }
    if (employeeId) clauses.push(eq(schema.attendanceEntries.employeeId, employeeId));

    const rows = await db.select({
      e: schema.attendanceEntries,
      employeeName: schema.employees.fullName,
    }).from(schema.attendanceEntries)
      .leftJoin(schema.employees, eq(schema.attendanceEntries.employeeId, schema.employees.id))
      .where(and(...clauses));

    return NextResponse.json({ entries: rows.map(r => rowToEntry(r.e, r.employeeName)) });
  } catch (e) {
    return await handleErrorLogged(e, undefined, { category: 'payroll' });
  }
}

const createSchema = z.object({
  employeeId: z.string().uuid(),
  branchId: z.string().uuid().nullable().optional(),
  workDate: z.string().regex(dateRe),
  shiftAssignmentId: z.string().uuid().nullable().optional(),
  entryMode: z.enum(['time_range', 'total_minutes']),
  clockIn: z.string().regex(timeRe).nullable().optional(),
  clockOut: z.string().regex(timeRe).nullable().optional(),
  crossesMidnight: z.boolean().default(false),
  manualWorkedMinutes: z.number().int().min(0).max(1440).nullable().optional(),
  breakMinutes: z.number().int().min(0).max(1440).default(0),
  breakPolicy: z.enum(['paid', 'unpaid', 'none']).default('unpaid'),
  attendanceType: z.enum(['present', 'absent', 'paid_leave', 'unpaid_leave', 'sick_leave', 'holiday_work', 'off_day_work']).default('present'),
  managerNote: z.string().max(500).nullable().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await requireRole('SuperAdmin', 'BranchUser');
    const input = createSchema.parse(await req.json());

    if (session.role === 'BranchUser' && input.branchId && input.branchId !== session.branchId) {
      throw new ApiError(403, 'دسترسی خارج از شعبه‌ی شما مجاز نیست', 'FORBIDDEN_BRANCH');
    }
    const branchId = session.role === 'BranchUser' ? (session.branchId ?? null) : (input.branchId ?? null);

    let plannedMinutes = 0;
    if (input.shiftAssignmentId) {
      const [assignment] = await db.select().from(schema.employeeShiftAssignments)
        .where(eq(schema.employeeShiftAssignments.id, input.shiftAssignmentId)).limit(1);
      if (!assignment) throw new ApiError(404, 'تخصیص شیفت پیدا نشد', 'ASSIGNMENT_NOT_FOUND');
      plannedMinutes = assignment.plannedMinutes;
    }

    const derived = await computeDerivedFields({
      employeeId: input.employeeId, workDate: input.workDate, entryMode: input.entryMode,
      clockIn: input.clockIn, clockOut: input.clockOut, crossesMidnight: input.crossesMidnight,
      manualWorkedMinutes: input.manualWorkedMinutes, breakMinutes: input.breakMinutes,
      breakPolicy: input.breakPolicy, attendanceType: input.attendanceType, plannedMinutes,
    });

    const [row] = await db.insert(schema.attendanceEntries).values({
      employeeId: input.employeeId, branchId, workDate: toDate(input.workDate),
      shiftAssignmentId: input.shiftAssignmentId ?? null,
      entryMode: input.entryMode, clockIn: input.clockIn ?? null, clockOut: input.clockOut ?? null,
      manualWorkedMinutes: input.manualWorkedMinutes ?? null, breakMinutes: input.breakMinutes,
      workedMinutes: derived.workedMinutes, regularMinutes: derived.regularMinutes,
      overtimeMinutes: derived.overtimeMinutes, nightMinutes: derived.nightMinutes,
      holidayMinutes: derived.holidayMinutes, hourlyRateSnapshot: derived.hourlyRateSnapshot,
      attendanceType: input.attendanceType, managerNote: input.managerNote ?? null,
      createdBy: session.sub,
    }).returning();
    if (!row) throw new ApiError(500, 'خطا در ثبت حضور', 'INSERT_FAILED');

    return NextResponse.json({ entry: rowToEntry(row), plannedMinutes }, { status: 201 });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
