import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleErrorLogged } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    // void به‌جای حذف فیزیکی — تاریخچه حفظ می‌شود
    const [ev] = await db.update(schema.payrollEvents)
      .set({ voidedAt: new Date(), voidReason: 'حذف توسط مدیر' })
      .where(eq(schema.payrollEvents.id, params.id)).returning();
    if (!ev) throw new ApiError(404, 'رویداد پیدا نشد', 'NOT_FOUND');
    return NextResponse.json({ ok: true });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
