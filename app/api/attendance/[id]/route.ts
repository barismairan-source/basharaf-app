import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireRole } from '@/lib/auth/session';
import { ApiError, handleErrorLogged } from '@/lib/api-error';
import { canEditAttendance, type AttendanceIntervalInput } from '@/lib/payroll/attendanceEngine';
import { computeDerivedFields, assertNoAttendanceOverlap } from '@/lib/payroll/attendanceEntryHelpers';

export const dynamic = 'force-dynamic';

const timeRe = /^([0-1]?\d|2[0-3]):([0-5]\d)$/;

const patchSchema = z.object({
  entryMode: z.enum(['time_range', 'total_minutes']).optional(),
  clockIn: z.string().regex(timeRe).nullable().optional(),
  clockOut: z.string().regex(timeRe).nullable().optional(),
  crossesMidnight: z.boolean().optional(),
  manualWorkedMinutes: z.number().int().min(0).max(1440).nullable().optional(),
  breakMinutes: z.number().int().min(0).max(1440).optional(),
  breakPolicy: z.enum(['paid', 'unpaid', 'none']).optional(),
  attendanceType: z.enum(['present', 'absent', 'paid_leave', 'unpaid_leave', 'sick_leave', 'holiday_work', 'off_day_work']).optional(),
  overtimeApproved: z.boolean().optional(),
  managerNote: z.string().max(500).nullable().optional(),
  /** اتصال «حضور بدون شیفت» به یکی از شیفت‌های همان روز (یا null برای جدا کردن) */
  shiftAssignmentId: z.string().uuid().nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole('SuperAdmin', 'BranchUser');
    const input = patchSchema.parse(await req.json());

    const [existing] = await db.select().from(schema.attendanceEntries)
      .where(eq(schema.attendanceEntries.id, params.id)).limit(1);
    if (!existing) throw new ApiError(404, 'رکورد حضور پیدا نشد', 'NOT_FOUND');
    if (session.role === 'BranchUser' && existing.branchId !== session.branchId) {
      throw new ApiError(403, 'دسترسی خارج از شعبه‌ی شما مجاز نیست', 'FORBIDDEN_BRANCH');
    }
    if (!canEditAttendance(existing.status)) {
      throw new ApiError(409, 'رکورد قفل‌شده قابل ویرایش از این مسیر نیست', 'LOCKED');
    }
    // فقط SuperAdmin مجاز به تأیید اضافه‌کاری است
    if (input.overtimeApproved !== undefined && session.role !== 'SuperAdmin') {
      throw new ApiError(403, 'فقط مدیر مجاز به تأیید اضافه‌کاری است', 'FORBIDDEN');
    }

    const workDate = existing.workDate.toISOString().slice(0, 10);
    const nextShiftAssignmentId = input.shiftAssignmentId !== undefined ? input.shiftAssignmentId : existing.shiftAssignmentId;

    let plannedMinutes = 0;
    let assignment: typeof schema.employeeShiftAssignments.$inferSelect | undefined;
    if (nextShiftAssignmentId) {
      [assignment] = await db.select().from(schema.employeeShiftAssignments)
        .where(eq(schema.employeeShiftAssignments.id, nextShiftAssignmentId)).limit(1);
      if (!assignment) throw new ApiError(404, 'تخصیص شیفت پیدا نشد', 'ASSIGNMENT_NOT_FOUND');
      if (assignment.employeeId !== existing.employeeId || assignment.workDate.toISOString().slice(0, 10) !== workDate) {
        throw new ApiError(400, 'این تخصیص شیفت متعلق به همین کارمند/روز نیست', 'ASSIGNMENT_MISMATCH');
      }
      plannedMinutes = assignment.plannedMinutes;
    }

    const entryMode = input.entryMode ?? existing.entryMode;
    const attendanceType = input.attendanceType ?? existing.attendanceType;
    const crossesMidnight = input.crossesMidnight ?? false;
    const breakMinutes = input.breakMinutes ?? existing.breakMinutes;
    const breakPolicy = input.breakPolicy ?? 'unpaid';
    const clockIn = input.clockIn !== undefined ? input.clockIn : existing.clockIn;
    const clockOut = input.clockOut !== undefined ? input.clockOut : existing.clockOut;
    const manualWorkedMinutes = input.manualWorkedMinutes !== undefined ? input.manualWorkedMinutes : existing.manualWorkedMinutes;

    const derived = await computeDerivedFields({
      employeeId: existing.employeeId, workDate, entryMode,
      clockIn, clockOut, crossesMidnight, manualWorkedMinutes,
      breakMinutes, breakPolicy, attendanceType, plannedMinutes,
    });

    const candidate: AttendanceIntervalInput = {
      id: existing.id, attendanceType, entryMode, clockIn, clockOut, crossesMidnight,
      shiftAssignmentId: nextShiftAssignmentId,
      assignmentStartTime: assignment?.plannedStartTime ?? null, assignmentEndTime: assignment?.plannedEndTime ?? null,
      assignmentCrossesMidnight: assignment?.crossesMidnight ?? false,
    };

    const row = await db.transaction(async (tx) => {
      await assertNoAttendanceOverlap(tx, candidate, existing.employeeId, workDate);
      const [updated] = await tx.update(schema.attendanceEntries).set({
        ...(input.entryMode !== undefined ? { entryMode: input.entryMode } : {}),
        ...(input.clockIn !== undefined ? { clockIn: input.clockIn } : {}),
        ...(input.clockOut !== undefined ? { clockOut: input.clockOut } : {}),
        ...(input.manualWorkedMinutes !== undefined ? { manualWorkedMinutes: input.manualWorkedMinutes } : {}),
        ...(input.shiftAssignmentId !== undefined ? { shiftAssignmentId: input.shiftAssignmentId } : {}),
        breakMinutes,
        ...(input.attendanceType !== undefined ? { attendanceType: input.attendanceType } : {}),
        ...(input.overtimeApproved !== undefined ? { overtimeApproved: input.overtimeApproved } : {}),
        ...(input.managerNote !== undefined ? { managerNote: input.managerNote } : {}),
        workedMinutes: derived.workedMinutes, regularMinutes: derived.regularMinutes,
        overtimeMinutes: derived.overtimeMinutes, nightMinutes: derived.nightMinutes,
        holidayMinutes: derived.holidayMinutes, hourlyRateSnapshot: derived.hourlyRateSnapshot,
        updatedAt: new Date(),
      }).where(eq(schema.attendanceEntries.id, params.id)).returning();
      if (!updated) throw new ApiError(500, 'خطا در ویرایش حضور', 'UPDATE_FAILED');
      return updated;
    });

    return NextResponse.json({ entry: { ...row, hourlyRateSnapshot: Number(row.hourlyRateSnapshot) } });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole('SuperAdmin', 'BranchUser');
    const [existing] = await db.select().from(schema.attendanceEntries)
      .where(eq(schema.attendanceEntries.id, params.id)).limit(1);
    if (!existing) throw new ApiError(404, 'رکورد حضور پیدا نشد', 'NOT_FOUND');
    if (session.role === 'BranchUser' && existing.branchId !== session.branchId) {
      throw new ApiError(403, 'دسترسی خارج از شعبه‌ی شما مجاز نیست', 'FORBIDDEN_BRANCH');
    }
    if (!canEditAttendance(existing.status)) {
      throw new ApiError(409, 'رکورد قفل‌شده قابل حذف نیست', 'LOCKED');
    }
    await db.delete(schema.attendanceEntries).where(eq(schema.attendanceEntries.id, params.id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
