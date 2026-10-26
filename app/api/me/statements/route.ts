import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { handleErrorLogged } from '@/lib/api-error';
import { requireMe, requireUnlocked } from '@/lib/staff-panel/session';

export const dynamic = 'force-dynamic';

/** GET /api/me/statements — ریز کارکرد و محاسبه‌ی ماه‌های گذشته‌ی همین نفر. نیاز به قفل Face ID باز. */
export async function GET(req: Request) {
  try {
    const device = await requireMe();
    await requireUnlocked(device);
    const rows = await db.select({
      id: schema.staffStatements.id, period: schema.staffStatements.periodYearMonth,
      model: schema.staffStatements.model, title: schema.staffStatements.title, total: schema.staffStatements.totalAmount,
    }).from(schema.staffStatements)
      .where(eq(schema.staffStatements.employeeId, device.employeeId))
      .orderBy(desc(schema.staffStatements.periodYearMonth)).limit(24);
    return NextResponse.json({ statements: rows.map((r) => ({ ...r, total: Number(r.total) })) });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
