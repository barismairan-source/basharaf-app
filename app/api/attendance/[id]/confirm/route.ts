import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleErrorLogged } from '@/lib/api-error';
import { canConfirmAttendance } from '@/lib/payroll/attendanceEngine';

export const dynamic = 'force-dynamic';

/** تأیید حضور — فقط مدیر مجاز است؛ فقط رکورد draft قابل تأیید است. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAdmin();
    const [existing] = await db.select().from(schema.attendanceEntries)
      .where(eq(schema.attendanceEntries.id, params.id)).limit(1);
    if (!existing) throw new ApiError(404, 'رکورد حضور پیدا نشد', 'NOT_FOUND');
    if (!canConfirmAttendance(existing.status)) {
      throw new ApiError(409, 'فقط رکورد پیش‌نویس قابل تأیید است', 'NOT_DRAFT');
    }
    const [row] = await db.update(schema.attendanceEntries).set({
      status: 'confirmed', confirmedBy: session.sub, confirmedAt: new Date(), updatedAt: new Date(),
    }).where(eq(schema.attendanceEntries.id, params.id)).returning();
    if (!row) throw new ApiError(500, 'خطا در تأیید حضور', 'UPDATE_FAILED');
    return NextResponse.json({ ok: true, entry: { ...row, hourlyRateSnapshot: Number(row.hourlyRateSnapshot) } });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
