import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { handleErrorLogged } from '@/lib/api-error';
import { requireMe, requireUnlocked } from '@/lib/staff-panel/session';
import { sortPayments, type PaymentKind } from '@/lib/staff-panel/payments';

export const dynamic = 'force-dynamic';

/** GET /api/me/payments — همه‌ی واریزی‌های بانکی همین نفر (حقوق، اضافه‌کاری، …). نیاز به قفل Face ID باز. */
export async function GET(req: Request) {
  try {
    const device = await requireMe();
    await requireUnlocked(device);
    const rows = await db.select({
      id: schema.staffPayments.id, period: schema.staffPayments.periodYearMonth, kind: schema.staffPayments.kind,
      amount: schema.staffPayments.amount, paidOn: schema.staffPayments.paidOn, title: schema.staffPayments.title,
      hasReceipt: schema.staffPayments.hasReceipt,
    }).from(schema.staffPayments)
      .where(eq(schema.staffPayments.employeeId, device.employeeId)).limit(200);
    return NextResponse.json({ payments: sortPayments(rows.map((r) => ({ ...r, kind: r.kind as PaymentKind, amount: Number(r.amount) }))) });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
