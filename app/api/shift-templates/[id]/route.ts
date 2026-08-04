import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleErrorLogged } from '@/lib/api-error';
import { validateShiftMinutes, minutesBetween } from '@/lib/payroll/attendanceEngine';

export const dynamic = 'force-dynamic';

const timeRe = /^([0-1]?\d|2[0-3]):([0-5]\d)$/;

const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  startTime: z.string().regex(timeRe).optional(),
  endTime: z.string().regex(timeRe).optional(),
  crossesMidnight: z.boolean().optional(),
  defaultBreakMinutes: z.number().int().min(0).max(1440).optional(),
  breakPolicy: z.enum(['paid', 'unpaid', 'none']).optional(),
  color: z.string().max(20).nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const input = patchSchema.parse(await req.json());
    const [existing] = await db.select().from(schema.shiftTemplates)
      .where(eq(schema.shiftTemplates.id, params.id)).limit(1);
    if (!existing) throw new ApiError(404, 'قالب شیفت پیدا نشد', 'NOT_FOUND');

    const startTime = input.startTime ?? existing.startTime;
    const endTime = input.endTime ?? existing.endTime;
    const crossesMidnight = input.crossesMidnight ?? existing.crossesMidnight;
    let plannedMinutes = existing.plannedMinutes;
    if (input.startTime || input.endTime || input.crossesMidnight !== undefined) {
      plannedMinutes = minutesBetween(startTime, endTime, crossesMidnight);
      if (!validateShiftMinutes(plannedMinutes)) {
        throw new ApiError(400, 'مدت شیفت باید بین ۱ تا ۱۴۴۰ دقیقه باشد', 'INVALID_DURATION');
      }
    }

    const [row] = await db.update(schema.shiftTemplates).set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      startTime, endTime, plannedMinutes, crossesMidnight,
      ...(input.defaultBreakMinutes !== undefined ? { defaultBreakMinutes: input.defaultBreakMinutes } : {}),
      ...(input.breakPolicy !== undefined ? { breakPolicy: input.breakPolicy } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      updatedAt: new Date(),
    }).where(eq(schema.shiftTemplates.id, params.id)).returning();
    if (!row) throw new ApiError(500, 'خطا در ویرایش قالب شیفت', 'UPDATE_FAILED');

    return NextResponse.json({
      shiftTemplate: {
        id: row.id, branchId: row.branchId, name: row.name,
        startTime: row.startTime, endTime: row.endTime, plannedMinutes: row.plannedMinutes,
        defaultBreakMinutes: row.defaultBreakMinutes, breakPolicy: row.breakPolicy,
        crossesMidnight: row.crossesMidnight, color: row.color, isActive: row.isActive,
        createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
      },
    });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    // soft-delete — تخصیص‌های شیفت گذشته که به این قالب اشاره دارند snapshot دارند و متاثر نمی‌شوند
    const [row] = await db.update(schema.shiftTemplates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(schema.shiftTemplates.id, params.id)).returning();
    if (!row) throw new ApiError(404, 'قالب شیفت پیدا نشد', 'NOT_FOUND');
    return NextResponse.json({ ok: true });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
