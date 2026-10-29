import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { assertBranch, assertCan } from '@/lib/auth/apiAccess';
import { ApiError, handleErrorLogged } from '@/lib/api-error';
import { audit } from '@/lib/auth/audit';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/hr/clock/networks/[id] — غیرفعال‌کردن (نه حذف): رویدادهای قبلی به
 * همین ردیف ارجاع دارند و سابقه‌ی «از کدام نشانی تأیید شد» باید بماند.
 */
export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await requireSession();
    assertCan(session, 'hr.attendance.clockSetup');
    const [row] = await db.select().from(schema.branchAttendanceNetworks)
      .where(eq(schema.branchAttendanceNetworks.id, params.id)).limit(1);
    if (!row) throw new ApiError(404, 'پیدا نشد', 'NOT_FOUND');
    assertBranch(session, row.branchId);
    await db.update(schema.branchAttendanceNetworks)
      .set({ isActive: false, deactivatedAt: new Date(), deactivatedBy: session.sub })
      .where(and(eq(schema.branchAttendanceNetworks.id, params.id), eq(schema.branchAttendanceNetworks.isActive, true)));
    void audit({ action: 'attendance.network.deactivated', userId: session.sub, meta: { networkId: row.id, branchId: row.branchId, cidr: row.cidr } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
