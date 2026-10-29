import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { assertBranch, assertCan } from '@/lib/auth/apiAccess';
import { ApiError, handleErrorLogged } from '@/lib/api-error';
import { audit } from '@/lib/auth/audit';

export const dynamic = 'force-dynamic';

/** DELETE /api/hr/clock/links/[id] — لغو لینک/گوشی (مثلاً گوشی گم شده یا نفر رفته). */
export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await requireSession();
    assertCan(session, 'hr.attendance.clockSetup');
    const [row] = await db.select({
      id: schema.attendanceClockDevices.id,
      employeeId: schema.attendanceClockDevices.employeeId,
      branchId: schema.employees.branchId,
    }).from(schema.attendanceClockDevices)
      .innerJoin(schema.employees, eq(schema.attendanceClockDevices.employeeId, schema.employees.id))
      .where(eq(schema.attendanceClockDevices.id, params.id)).limit(1);
    if (!row) throw new ApiError(404, 'پیدا نشد', 'NOT_FOUND');
    assertBranch(session, row.branchId);
    await db.update(schema.attendanceClockDevices)
      .set({ revokedAt: new Date(), revokedBy: session.sub })
      .where(and(eq(schema.attendanceClockDevices.id, params.id), isNull(schema.attendanceClockDevices.revokedAt)));
    void audit({ action: 'attendance.link.revoked', userId: session.sub, meta: { employeeId: row.employeeId, deviceId: row.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}

const patchSchema = z.object({ faceIdExempt: z.boolean() });

/**
 * PATCH /api/hr/clock/links/[id] — استثنای فردی Face ID (مثلاً گوشی قدیمی بدون Face ID/اثر انگشت).
 * فقط برای همین نفر؛ تنظیم سراسری دست نمی‌خورد.
 */
export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await requireSession();
    assertCan(session, 'hr.attendance.clockSetup');
    const { faceIdExempt } = patchSchema.parse(await req.json());
    const [row] = await db.select({
      id: schema.attendanceClockDevices.id,
      employeeId: schema.attendanceClockDevices.employeeId,
      branchId: schema.employees.branchId,
    }).from(schema.attendanceClockDevices)
      .innerJoin(schema.employees, eq(schema.attendanceClockDevices.employeeId, schema.employees.id))
      .where(and(eq(schema.attendanceClockDevices.id, params.id), isNull(schema.attendanceClockDevices.revokedAt))).limit(1);
    if (!row) throw new ApiError(404, 'پیدا نشد', 'NOT_FOUND');
    assertBranch(session, row.branchId);
    await db.update(schema.attendanceClockDevices).set({ faceIdExempt })
      .where(eq(schema.attendanceClockDevices.id, params.id));
    void audit({ action: 'attendance.faceIdExempt.changed', userId: session.sub, meta: { employeeId: row.employeeId, deviceId: row.id, faceIdExempt } });
    return NextResponse.json({ ok: true, faceIdExempt });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
