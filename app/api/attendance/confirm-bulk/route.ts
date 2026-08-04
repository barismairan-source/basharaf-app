import { NextResponse } from 'next/server';
import { inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { handleErrorLogged } from '@/lib/api-error';
import { canConfirmAttendance } from '@/lib/payroll/attendanceEngine';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({ ids: z.array(z.string().uuid()).min(1).max(500) });

/** تأیید گروهی حضور — فقط مدیر؛ رکوردهای غیر-draft در skipped برمی‌گردند. */
export async function POST(req: Request) {
  try {
    const session = await requireAdmin();
    const { ids } = bodySchema.parse(await req.json());

    const rows = await db.select().from(schema.attendanceEntries).where(inArray(schema.attendanceEntries.id, ids));
    const confirmable = rows.filter(r => canConfirmAttendance(r.status)).map(r => r.id);
    const skipped = rows.filter(r => !canConfirmAttendance(r.status)).map(r => r.id);
    const notFound = ids.filter(id => !rows.some(r => r.id === id));

    if (confirmable.length > 0) {
      await db.update(schema.attendanceEntries).set({
        status: 'confirmed', confirmedBy: session.sub, confirmedAt: new Date(), updatedAt: new Date(),
      }).where(inArray(schema.attendanceEntries.id, confirmable));
    }

    return NextResponse.json({ confirmed: confirmable, skipped, notFound });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
