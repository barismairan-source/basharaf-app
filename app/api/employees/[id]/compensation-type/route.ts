import { NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleErrorLogged } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

const changeSchema = z.object({
  toType: z.enum(['hourly', 'monthly']),
  effectiveFrom: z.string().regex(dateRe, 'فرمت تاریخ باید YYYY-MM-DD باشد'),
  reason: z.string().max(500).nullable().optional(),
});

/**
 * GET — تاریخچه‌ی تغییر نوع حقوق (گزارش حسابرسی).
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const rows = await db.select().from(schema.employeeCompensationTypeChanges)
      .where(eq(schema.employeeCompensationTypeChanges.employeeId, params.id))
      .orderBy(desc(schema.employeeCompensationTypeChanges.effectiveFrom));
    return NextResponse.json({
      changes: rows.map(r => ({
        id: r.id, employeeId: r.employeeId, fromType: r.fromType, toType: r.toType,
        effectiveFrom: r.effectiveFrom.toISOString().slice(0, 10),
        changedBy: r.changedBy, reason: r.reason, createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    return await handleErrorLogged(e, undefined, { category: 'payroll' });
  }
}

/**
 * POST — تغییر نوع حقوق کارمند + گزارش حسابرسی. فقط مدیر کل مجاز است.
 * فیش‌ها و دوره‌های گذشته (که snapshot خودشان را دارند) تغییر نمی‌کنند —
 * این فقط مسیر محاسبه‌ی *بعدی* را عوض می‌کند.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAdmin();
    const input = changeSchema.parse(await req.json());

    const [employee] = await db.select().from(schema.employees).where(eq(schema.employees.id, params.id)).limit(1);
    if (!employee) throw new ApiError(404, 'پرسنل پیدا نشد', 'NOT_FOUND');
    if (employee.compensationType === input.toType) {
      throw new ApiError(409, 'این کارمند از قبل همین نوع حقوق را دارد', 'ALREADY_SET');
    }
    if (input.toType === 'monthly' && Number(employee.baseMonthlySalary) <= 0) {
      throw new ApiError(400, 'قبل از تغییر به ماهانه، ابتدا حقوق پایه‌ی ماهانه را در پرونده‌ی پرسنل تعریف کنید', 'NO_BASE_SALARY');
    }

    const result = await db.transaction(async (tx) => {
      await tx.insert(schema.employeeCompensationTypeChanges).values({
        employeeId: employee.id,
        fromType: employee.compensationType,
        toType: input.toType,
        effectiveFrom: new Date(input.effectiveFrom + 'T00:00:00Z'),
        changedBy: session.sub,
        reason: input.reason ?? null,
      });
      const [updated] = await tx.update(schema.employees)
        .set({ compensationType: input.toType, updatedAt: new Date() })
        .where(eq(schema.employees.id, employee.id)).returning();
      if (!updated) throw new ApiError(500, 'خطا در تغییر نوع حقوق', 'UPDATE_FAILED');
      return updated;
    });

    return NextResponse.json({ compensationType: result.compensationType });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
