import { NextResponse } from 'next/server';
import { eq, and, gte, lte, inArray, ne } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession, requireRole } from '@/lib/auth/session';
import { ApiError, handleErrorLogged } from '@/lib/api-error';
import { minutesBetween, validateShiftMinutes, shiftRangesOverlap } from '@/lib/payroll/attendanceEngine';

export const dynamic = 'force-dynamic';

const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const timeRe = /^([0-1]?\d|2[0-3]):([0-5]\d)$/;

function toDate(s: string): Date { return new Date(s + 'T00:00:00Z'); }
function toDateStr(d: Date): string { return d.toISOString().slice(0, 10); }

function rowToAssignment(row: typeof schema.employeeShiftAssignments.$inferSelect, employeeName?: string | null) {
  return {
    id: row.id, employeeId: row.employeeId, employeeName: employeeName ?? null,
    branchId: row.branchId, workDate: toDateStr(row.workDate),
    shiftTemplateId: row.shiftTemplateId,
    plannedStartTime: row.plannedStartTime, plannedEndTime: row.plannedEndTime,
    plannedMinutes: row.plannedMinutes, breakMinutes: row.breakMinutes,
    breakPolicy: row.breakPolicy, crossesMidnight: row.crossesMidnight,
    status: row.status, note: row.note,
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

    const clauses = [gte(schema.employeeShiftAssignments.workDate, toDate(from)), lte(schema.employeeShiftAssignments.workDate, toDate(to))];
    if (session.role === 'BranchUser' && session.branchId) {
      clauses.push(eq(schema.employeeShiftAssignments.branchId, session.branchId));
    } else if (branchIdParam) {
      clauses.push(eq(schema.employeeShiftAssignments.branchId, branchIdParam));
    }
    if (employeeId) clauses.push(eq(schema.employeeShiftAssignments.employeeId, employeeId));

    const rows = await db.select({
      a: schema.employeeShiftAssignments,
      employeeName: schema.employees.fullName,
    }).from(schema.employeeShiftAssignments)
      .leftJoin(schema.employees, eq(schema.employeeShiftAssignments.employeeId, schema.employees.id))
      .where(and(...clauses));

    return NextResponse.json({ assignments: rows.map(r => rowToAssignment(r.a, r.employeeName)) });
  } catch (e) {
    return await handleErrorLogged(e, undefined, { category: 'payroll' });
  }
}

const createSchema = z.object({
  employeeIds: z.array(z.string().uuid()).min(1),
  workDates: z.array(z.string().regex(dateRe)).min(1),
  branchId: z.string().uuid().nullable().optional(),
  shiftTemplateId: z.string().uuid().nullable().optional(),
  startTime: z.string().regex(timeRe),
  endTime: z.string().regex(timeRe),
  crossesMidnight: z.boolean().default(false),
  breakMinutes: z.number().int().min(0).max(1440).default(0),
  breakPolicy: z.enum(['paid', 'unpaid', 'none']).default('unpaid'),
  note: z.string().max(500).nullable().optional(),
});

/**
 * ساخت تخصیص شیفت — تک یا گروهی (چند کارمند × چند روز = کپی شیفت).
 * برای هر ترکیب کارمند+روز، اگر با شیفت غیرلغوشده‌ی موجود هم‌پوشان باشد،
 * آن ترکیب رد می‌شود (نه کل درخواست) و در پاسخ conflicts برمی‌گردد.
 */
export async function POST(req: Request) {
  try {
    const session = await requireRole('SuperAdmin', 'BranchUser');
    const input = createSchema.parse(await req.json());

    if (session.role === 'BranchUser' && input.branchId && input.branchId !== session.branchId) {
      throw new ApiError(403, 'دسترسی خارج از شعبه‌ی شما مجاز نیست', 'FORBIDDEN_BRANCH');
    }
    const branchId = session.role === 'BranchUser' ? (session.branchId ?? null) : (input.branchId ?? null);

    const plannedMinutes = minutesBetween(input.startTime, input.endTime, input.crossesMidnight);
    if (!validateShiftMinutes(plannedMinutes)) {
      throw new ApiError(400, 'مدت شیفت باید بین ۱ تا ۱۴۴۰ دقیقه باشد', 'INVALID_DURATION');
    }
    if (input.breakMinutes > plannedMinutes) {
      throw new ApiError(400, 'استراحت نمی‌تواند بیشتر از مدت شیفت باشد', 'INVALID_BREAK');
    }

    const created: ReturnType<typeof rowToAssignment>[] = [];
    const conflicts: Array<{ employeeId: string; workDate: string }> = [];

    await db.transaction(async (tx) => {
      const dates = [...new Set(input.workDates)];
      const existingByEmployee = await tx.select().from(schema.employeeShiftAssignments)
        .where(and(
          inArray(schema.employeeShiftAssignments.employeeId, input.employeeIds),
          inArray(schema.employeeShiftAssignments.workDate, dates.map(toDate)),
          ne(schema.employeeShiftAssignments.status, 'cancelled'),
        ));

      for (const employeeId of input.employeeIds) {
        for (const workDate of dates) {
          const sameDay = existingByEmployee.filter(
            e => e.employeeId === employeeId && toDateStr(e.workDate) === workDate
          );
          const overlap = sameDay.some(e => shiftRangesOverlap(
            input.startTime, input.endTime, input.crossesMidnight,
            e.plannedStartTime, e.plannedEndTime, e.crossesMidnight,
          ));
          if (overlap) { conflicts.push({ employeeId, workDate }); continue; }

          const [row] = await tx.insert(schema.employeeShiftAssignments).values({
            employeeId, branchId, workDate: toDate(workDate),
            shiftTemplateId: input.shiftTemplateId ?? null,
            plannedStartTime: input.startTime, plannedEndTime: input.endTime,
            plannedMinutes, breakMinutes: input.breakMinutes, breakPolicy: input.breakPolicy,
            crossesMidnight: input.crossesMidnight, note: input.note ?? null,
            createdBy: session.sub, updatedBy: session.sub,
          }).returning();
          if (row) created.push(rowToAssignment(row));
        }
      }
    });

    return NextResponse.json({ created, conflicts }, { status: 201 });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
