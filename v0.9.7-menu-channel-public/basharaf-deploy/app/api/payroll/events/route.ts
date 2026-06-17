import { NextResponse } from 'next/server';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession, requireAdmin } from '@/lib/auth/session';
import { ApiError, handleErrorLogged } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  employeeId: z.string().uuid('کارمند نامعتبر'),
  type: z.enum(['advance', 'deduction', 'bonus']),
  amount: z.number().int().min(1, 'مبلغ باید مثبت باشد'),
  periodYearMonth: z.string().regex(/^\d{4}-\d{2}$/, 'فرمت دوره: YYYY-MM'),
  description: z.string().max(300).optional().nullable(),
});

const EVENT_LABELS: Record<string, string> = {
  advance: 'مساعده', deduction: 'کسری', bonus: 'پاداش', settlement: 'تسویه',
};

export async function GET(req: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period');
    const employeeId = searchParams.get('employeeId');

    const conds = [isNull(schema.payrollEvents.voidedAt)];
    if (period) conds.push(eq(schema.payrollEvents.periodYearMonth, period));
    if (employeeId) conds.push(eq(schema.payrollEvents.employeeId, employeeId));

    const rows = await db.select({
      id: schema.payrollEvents.id,
      employeeId: schema.payrollEvents.employeeId,
      employeeName: schema.employees.fullName,
      type: schema.payrollEvents.type,
      amount: schema.payrollEvents.amount,
      periodYearMonth: schema.payrollEvents.periodYearMonth,
      description: schema.payrollEvents.description,
      createdAt: schema.payrollEvents.createdAt,
    })
      .from(schema.payrollEvents)
      .leftJoin(schema.employees, eq(schema.payrollEvents.employeeId, schema.employees.id))
      .where(and(...conds))
      .orderBy(desc(schema.payrollEvents.createdAt));

    return NextResponse.json({
      events: rows.map(e => ({
        id: e.id, employeeId: e.employeeId, employeeName: e.employeeName ?? '—',
        type: e.type, typeLabel: EVENT_LABELS[e.type] ?? e.type,
        amount: Number(e.amount), periodYearMonth: e.periodYearMonth,
        description: e.description, createdAt: e.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    return await handleErrorLogged(e, undefined, { category: 'payroll' });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAdmin();
    const input = createSchema.parse(await req.json());
    const [ev] = await db.insert(schema.payrollEvents).values({
      employeeId: input.employeeId, type: input.type, amount: input.amount,
      periodYearMonth: input.periodYearMonth, description: input.description ?? null,
      createdBy: session.sub,
    }).returning();
    if (!ev) throw new ApiError(500, 'خطا در ثبت رویداد', 'INSERT_FAILED');
    return NextResponse.json({ event: { id: ev.id } }, { status: 201 });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
