import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireRole } from '@/lib/auth/session';
import { ApiError, handleErrorLogged } from '@/lib/api-error';
import { audit } from '@/lib/auth/audit';

export const dynamic = 'force-dynamic';

/**
 * POST /api/payroll/runs/[id]/force-reset — SuperAdmin only
 *
 * برای دوره‌هایی که status='posted' دارند ولی هیچ journal_voucher واقعی ندارند.
 * فقط payrollRuns.status را به 'approved' برمی‌گرداند — بدون هیچ اثر مالی.
 * اگر journal_voucher posted وجود داشته باشد → خطا (از reverse عادی استفاده کنید).
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole('SuperAdmin');

    const [run] = await db.select().from(schema.payrollRuns)
      .where(eq(schema.payrollRuns.id, params.id)).limit(1);
    if (!run) throw new ApiError(404, 'اجرا پیدا نشد', 'NOT_FOUND');
    if (run.status !== 'posted') throw new ApiError(409, 'فقط اجرای posted قابل بازنشانی اجباری است', 'NOT_POSTED');

    // اگر journal_voucher واقعی دارد → از reverse عادی استفاده کن
    const [voucher] = await db.select({ id: schema.journalVouchers.id })
      .from(schema.journalVouchers)
      .where(
        and(
          eq(schema.journalVouchers.idempotencyKey, `payroll_run:${params.id}`),
          eq(schema.journalVouchers.status, 'posted'),
        )
      ).limit(1);
    if (voucher) {
      throw new ApiError(
        409,
        'این دوره سند حسابداری دارد — برای برگشت از دکمه‌ی «برگشت ثبت» استفاده کنید',
        'HAS_JOURNAL_VOUCHER',
      );
    }

    await db.update(schema.payrollRuns)
      .set({ status: 'approved', postedToBasharafAt: null, journalVoucherId: null })
      .where(eq(schema.payrollRuns.id, params.id));

    await audit({
      action: 'payroll.forceReset',
      userId: session.sub,
      meta: { runId: params.id, periodYearMonth: run.periodYearMonth, branchName: run.branchName },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return await handleErrorLogged(e, undefined, { category: 'payroll' });
  }
}
