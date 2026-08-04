import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireRole } from '@/lib/auth/session';
import { ApiError, handleErrorLogged } from '@/lib/api-error';
import { canEditAttendance } from '@/lib/payroll/attendanceEngine';
import { computeDerivedFields } from '@/lib/payroll/attendanceEntryHelpers';

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

    let plannedMinutes = 0;
    if (existing.shiftAssignmentId) {
      const [assignment] = await db.select().from(schema.employeeShiftAssignments)
        .where(eq(schema.employeeShiftAssignments.id, existing.shiftAssignmentId)).limit(1);
      plannedMinutes = assignment?.plannedMinutes ?? 0;
    }

    const workDate = existing.workDate.toISOString().slice(0, 10);
    const entryMode = input.entryMode ?? existing.entryMode;
    const attendanceType = input.attendanceType ?? existing.attendanceType;
    const crossesMidnight = input.crossesMidnight ?? false;
    const breakMinutes = input.breakMinutes ?? existing.breakMinutes;
    const breakPolicy = input.breakPolicy ?? 'unpaid';

    const derived = await computeDerivedFields({
      employeeId: existing.employeeId, workDate, entryMode,
      clockIn: input.clockIn !== undefined ? input.clockIn : existing.clockIn,
      clockOut: input.clockOut !== undefined ? input.clockOut : existing.clockOut,
      crossesMidnight,
      manualWorkedMinutes: input.manualWorkedMinutes !== undefined ? input.manualWorkedMinutes : existing.manualWorkedMinutes,
      breakMinutes, breakPolicy, attendanceType, plannedMinutes,
    });

    const [row] = await db.update(schema.attendanceEntries).set({
      ...(input.entryMode !== undefined ? { entryMode: input.entryMode } : {}),
      ...(input.clockIn !== undefined ? { clockIn: input.clockIn } : {}),
      ...(input.clockOut !== undefined ? { clockOut: input.clockOut } : {}),
      ...(input.manualWorkedMinutes !== undefined ? { manualWorkedMinutes: input.manualWorkedMinutes } : {}),
      breakMinutes,
      ...(input.attendanceType !== undefined ? { attendanceType: input.attendanceType } : {}),
      ...(input.overtimeApproved !== undefined ? { overtimeApproved: input.overtimeApproved } : {}),
      ...(input.managerNote !== undefined ? { managerNote: input.managerNote } : {}),
      workedMinutes: derived.workedMinutes, regularMinutes: derived.regularMinutes,
      overtimeMinutes: derived.overtimeMinutes, nightMinutes: derived.nightMinutes,
      holidayMinutes: derived.holidayMinutes, hourlyRateSnapshot: derived.hourlyRateSnapshot,
      updatedAt: new Date(),
    }).where(eq(schema.attendanceEntries.id, params.id)).returning();
    if (!row) throw new ApiError(500, 'خطا در ویرایش حضور', 'UPDATE_FAILED');

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
