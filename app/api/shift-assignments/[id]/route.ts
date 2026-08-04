import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireRole } from '@/lib/auth/session';
import { ApiError, handleErrorLogged } from '@/lib/api-error';
import { minutesBetween, validateShiftMinutes } from '@/lib/payroll/attendanceEngine';

export const dynamic = 'force-dynamic';

const timeRe = /^([0-1]?\d|2[0-3]):([0-5]\d)$/;

const patchSchema = z.object({
  startTime: z.string().regex(timeRe).optional(),
  endTime: z.string().regex(timeRe).optional(),
  crossesMidnight: z.boolean().optional(),
  breakMinutes: z.number().int().min(0).max(1440).optional(),
  breakPolicy: z.enum(['paid', 'unpaid', 'none']).optional(),
  note: z.string().max(500).nullable().optional(),
  status: z.enum(['scheduled', 'cancelled', 'completed']).optional(),
});

async function assertNotLocked(assignmentId: string): Promise<void> {
  const [linked] = await db.select().from(schema.attendanceEntries)
    .where(eq(schema.attendanceEntries.shiftAssignmentId, assignmentId)).limit(1);
  if (linked && linked.status === 'locked') {
    throw new ApiError(409, 'حضور مرتبط با این شیفت قفل شده — قابل ویرایش نیست', 'LOCKED');
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole('SuperAdmin', 'BranchUser');
    const input = patchSchema.parse(await req.json());

    const [existing] = await db.select().from(schema.employeeShiftAssignments)
      .where(eq(schema.employeeShiftAssignments.id, params.id)).limit(1);
    if (!existing) throw new ApiError(404, 'تخصیص شیفت پیدا نشد', 'NOT_FOUND');
    if (session.role === 'BranchUser' && existing.branchId !== session.branchId) {
      throw new ApiError(403, 'دسترسی خارج از شعبه‌ی شما مجاز نیست', 'FORBIDDEN_BRANCH');
    }
    await assertNotLocked(params.id);

    const startTime = input.startTime ?? existing.plannedStartTime;
    const endTime = input.endTime ?? existing.plannedEndTime;
    const crossesMidnight = input.crossesMidnight ?? existing.crossesMidnight;
    let plannedMinutes = existing.plannedMinutes;
    if (input.startTime || input.endTime || input.crossesMidnight !== undefined) {
      plannedMinutes = minutesBetween(startTime, endTime, crossesMidnight);
      if (!validateShiftMinutes(plannedMinutes)) {
        throw new ApiError(400, 'مدت شیفت باید بین ۱ تا ۱۴۴۰ دقیقه باشد', 'INVALID_DURATION');
      }
    }
    const breakMinutes = input.breakMinutes ?? existing.breakMinutes;
    if (breakMinutes > plannedMinutes) {
      throw new ApiError(400, 'استراحت نمی‌تواند بیشتر از مدت شیفت باشد', 'INVALID_BREAK');
    }

    const [row] = await db.update(schema.employeeShiftAssignments).set({
      plannedStartTime: startTime, plannedEndTime: endTime, plannedMinutes, crossesMidnight,
      breakMinutes,
      ...(input.breakPolicy !== undefined ? { breakPolicy: input.breakPolicy } : {}),
      ...(input.note !== undefined ? { note: input.note } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      updatedBy: session.sub, updatedAt: new Date(),
    }).where(eq(schema.employeeShiftAssignments.id, params.id)).returning();
    if (!row) throw new ApiError(500, 'خطا در ویرایش تخصیص شیفت', 'UPDATE_FAILED');

    return NextResponse.json({
      assignment: {
        id: row.id, employeeId: row.employeeId, branchId: row.branchId,
        workDate: row.workDate.toISOString().slice(0, 10),
        shiftTemplateId: row.shiftTemplateId,
        plannedStartTime: row.plannedStartTime, plannedEndTime: row.plannedEndTime,
        plannedMinutes: row.plannedMinutes, breakMinutes: row.breakMinutes,
        breakPolicy: row.breakPolicy, crossesMidnight: row.crossesMidnight,
        status: row.status, note: row.note, updatedAt: row.updatedAt.toISOString(),
      },
    });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole('SuperAdmin', 'BranchUser');
    const [existing] = await db.select().from(schema.employeeShiftAssignments)
      .where(eq(schema.employeeShiftAssignments.id, params.id)).limit(1);
    if (!existing) throw new ApiError(404, 'تخصیص شیفت پیدا نشد', 'NOT_FOUND');
    if (session.role === 'BranchUser' && existing.branchId !== session.branchId) {
      throw new ApiError(403, 'دسترسی خارج از شعبه‌ی شما مجاز نیست', 'FORBIDDEN_BRANCH');
    }
    await assertNotLocked(params.id);
    // لغو نرم — تاریخچه حفظ می‌شود (نه حذف فیزیکی)
    await db.update(schema.employeeShiftAssignments)
      .set({ status: 'cancelled', updatedBy: session.sub, updatedAt: new Date() })
      .where(eq(schema.employeeShiftAssignments.id, params.id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
