import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { canDo } from '@/lib/auth/permissions';
import { ApiError, handleErrorLogged } from '@/lib/api-error';
import { audit } from '@/lib/auth/audit';

export const dynamic = 'force-dynamic';

const linkSchema = z.object({ userId: z.string().uuid() });

/**
 * اتصال/قطع اتصال اختیاری پرونده‌ی پرسنلی ↔ حساب کاربری سیستم.
 * پرسنل و کاربران در جدول‌های جدا می‌مانند؛ این فقط یک لینک است، نه ادغام.
 * فقط مجوز hr.systemAccess.manage (پیش‌فرض: SuperAdmin).
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    if (!canDo(session, 'hr.systemAccess.manage')) throw new ApiError(403, 'دسترسی غیرمجاز', 'FORBIDDEN');
    const { userId } = linkSchema.parse(await req.json());

    const [employee] = await db.select().from(schema.employees).where(eq(schema.employees.id, params.id)).limit(1);
    if (!employee) throw new ApiError(404, 'پرسنل پیدا نشد', 'NOT_FOUND');

    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
    if (!user) throw new ApiError(404, 'کاربر پیدا نشد', 'USER_NOT_FOUND');

    const [alreadyLinked] = await db.select({ id: schema.employees.id }).from(schema.employees)
      .where(eq(schema.employees.userId, userId)).limit(1);
    if (alreadyLinked && alreadyLinked.id !== employee.id) {
      throw new ApiError(409, 'این حساب کاربری از قبل به یک پرونده‌ی پرسنلی دیگر متصل است', 'USER_ALREADY_LINKED');
    }

    const [updated] = await db.update(schema.employees).set({ userId, updatedAt: new Date() })
      .where(eq(schema.employees.id, params.id)).returning();
    if (!updated) throw new ApiError(500, 'خطا در اتصال', 'UPDATE_FAILED');

    void audit({ action: 'hr.employee.userLinked', userId: session.sub, meta: { employeeId: params.id, linkedUserId: userId } });
    return NextResponse.json({ ok: true, userId });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    if (!canDo(session, 'hr.systemAccess.manage')) throw new ApiError(403, 'دسترسی غیرمجاز', 'FORBIDDEN');

    const [employee] = await db.select().from(schema.employees).where(eq(schema.employees.id, params.id)).limit(1);
    if (!employee) throw new ApiError(404, 'پرسنل پیدا نشد', 'NOT_FOUND');
    const previousUserId = employee.userId;

    await db.update(schema.employees).set({ userId: null, updatedAt: new Date() })
      .where(eq(schema.employees.id, params.id));

    void audit({ action: 'hr.employee.userUnlinked', userId: session.sub, meta: { employeeId: params.id, previousUserId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
