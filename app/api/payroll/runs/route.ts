import { NextResponse } from 'next/server';
import { eq, desc, and } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession, requireAdmin } from '@/lib/auth/session';
import { ApiError, handleErrorLogged } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  periodYearMonth: z.string().regex(/^\d{4}-\d{2}$/, 'فرمت دوره: YYYY-MM (مثلاً 1405-03)'),
  branchId: z.string().uuid().nullable().optional(),
  branchName: z.string().max(120).nullable().optional(),
});

function serializeRun(r: typeof schema.payrollRuns.$inferSelect) {
  return {
    id: r.id, branchId: r.branchId, branchName: r.branchName,
    periodYearMonth: r.periodYearMonth, parametersId: r.parametersId,
    status: r.status,
    calculatedAt: r.calculatedAt?.toISOString() ?? null,
    approvedAt: r.approvedAt?.toISOString() ?? null,
    postedToBasharafAt: r.postedToBasharafAt?.toISOString() ?? null,
    journalVoucherId: r.journalVoucherId,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function GET() {
  try {
    await requireSession();
    const rows = await db.select().from(schema.payrollRuns).orderBy(desc(schema.payrollRuns.createdAt));
    return NextResponse.json({ runs: rows.map(serializeRun) });
  } catch (e) {
    return await handleErrorLogged(e, undefined, { category: 'payroll' });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const input = createSchema.parse(await req.json());

    // پارامتر سال شمسی این دوره را پیدا کن (مثلاً 1405-03 → سال 1405)
    const jalaliYear = parseInt(input.periodYearMonth.slice(0, 4), 10);
    const [param] = await db.select().from(schema.payrollParameters)
      .where(eq(schema.payrollParameters.jalaliYear, jalaliYear)).limit(1);
    if (!param) throw new ApiError(400, `پارامتر حقوق برای سال ${jalaliYear} تعریف نشده`, 'NO_PARAMS');

    // جلوگیری از اجرای تکراری برای همان شعبه/دوره
    const dup = await db.select().from(schema.payrollRuns).where(
      and(
        eq(schema.payrollRuns.periodYearMonth, input.periodYearMonth),
        input.branchId ? eq(schema.payrollRuns.branchId, input.branchId) : undefined,
      )
    ).limit(1);
    if (dup.length > 0) throw new ApiError(409, 'برای این دوره و شعبه قبلاً اجرا ساخته شده', 'DUPLICATE_RUN');

    const [run] = await db.insert(schema.payrollRuns).values({
      periodYearMonth: input.periodYearMonth,
      branchId: input.branchId ?? null,
      branchName: input.branchName ?? null,
      parametersId: param.id,
      status: 'draft',
    }).returning();
    if (!run) throw new ApiError(500, 'خطا در ساخت اجرا', 'INSERT_FAILED');
    return NextResponse.json({ run: serializeRun(run) }, { status: 201 });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
