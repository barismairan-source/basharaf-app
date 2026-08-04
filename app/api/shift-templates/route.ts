import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession, requireAdmin } from '@/lib/auth/session';
import { ApiError, handleErrorLogged } from '@/lib/api-error';
import { validateShiftMinutes, minutesBetween } from '@/lib/payroll/attendanceEngine';

export const dynamic = 'force-dynamic';

const timeRe = /^([0-1]?\d|2[0-3]):([0-5]\d)$/;

const saveSchema = z.object({
  branchId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(80),
  startTime: z.string().regex(timeRe, 'فرمت ساعت باید HH:MM باشد'),
  endTime: z.string().regex(timeRe, 'فرمت ساعت باید HH:MM باشد'),
  crossesMidnight: z.boolean().default(false),
  defaultBreakMinutes: z.number().int().min(0).max(1440).default(0),
  breakPolicy: z.enum(['paid', 'unpaid', 'none']).default('unpaid'),
  color: z.string().max(20).nullable().optional(),
});

function rowToTemplate(row: typeof schema.shiftTemplates.$inferSelect) {
  return {
    id: row.id, branchId: row.branchId, name: row.name,
    startTime: row.startTime, endTime: row.endTime,
    plannedMinutes: row.plannedMinutes,
    defaultBreakMinutes: row.defaultBreakMinutes,
    breakPolicy: row.breakPolicy, crossesMidnight: row.crossesMidnight,
    color: row.color, isActive: row.isActive,
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET() {
  try {
    await requireSession();
    const rows = await db.select().from(schema.shiftTemplates)
      .where(eq(schema.shiftTemplates.isActive, true));
    return NextResponse.json({ shiftTemplates: rows.map(rowToTemplate) });
  } catch (e) {
    return await handleErrorLogged(e, undefined, { category: 'payroll' });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const input = saveSchema.parse(await req.json());
    const plannedMinutes = minutesBetween(input.startTime, input.endTime, input.crossesMidnight);
    if (!validateShiftMinutes(plannedMinutes)) {
      throw new ApiError(400, 'مدت شیفت باید بین ۱ تا ۱۴۴۰ دقیقه باشد', 'INVALID_DURATION');
    }
    if (input.defaultBreakMinutes > plannedMinutes) {
      throw new ApiError(400, 'استراحت نمی‌تواند بیشتر از مدت شیفت باشد', 'INVALID_BREAK');
    }
    const [row] = await db.insert(schema.shiftTemplates).values({
      branchId: input.branchId ?? null,
      name: input.name,
      startTime: input.startTime,
      endTime: input.endTime,
      plannedMinutes,
      defaultBreakMinutes: input.defaultBreakMinutes,
      breakPolicy: input.breakPolicy,
      crossesMidnight: input.crossesMidnight,
      color: input.color ?? null,
    }).returning();
    if (!row) throw new ApiError(500, 'خطا در ساخت قالب شیفت', 'INSERT_FAILED');
    return NextResponse.json({ shiftTemplate: rowToTemplate(row) }, { status: 201 });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
