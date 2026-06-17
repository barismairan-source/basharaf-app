import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleErrorLogged } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAdmin();
    const [run] = await db.select().from(schema.payrollRuns).where(eq(schema.payrollRuns.id, params.id)).limit(1);
    if (!run) throw new ApiError(404, 'اجرا پیدا نشد', 'NOT_FOUND');
    if (run.status !== 'calculated')
      throw new ApiError(409, 'فقط اجرای محاسبه‌شده قابل تأیید است', 'BAD_STATE');

    const [updated] = await db.update(schema.payrollRuns)
      .set({ status: 'approved', approvedBy: session.sub, approvedAt: new Date() })
      .where(eq(schema.payrollRuns.id, params.id)).returning();
    return NextResponse.json({ ok: true, status: updated?.status });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
