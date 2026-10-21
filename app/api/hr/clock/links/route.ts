import { NextResponse } from 'next/server';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { assertBranch, assertCan, branchScope } from '@/lib/auth/apiAccess';
import { ApiError, handleErrorLogged } from '@/lib/api-error';
import { audit } from '@/lib/auth/audit';
import { hashToken, newToken } from '@/lib/attendance-clock/service';
import { LINK_TTL_HOURS } from '@/lib/attendance-clock/rules';

export const dynamic = 'force-dynamic';

/** GET /api/hr/clock/links — پرسنل فعال + وضعیت لینک/گوشی هر نفر. */
export async function GET(req: Request) {
  try {
    const session = await requireSession();
    assertCan(session, 'hr.attendance.view');
    const scope = branchScope(session);
    const branchParam = new URL(req.url).searchParams.get('branchId');
    const branchFilter = scope ?? (branchParam || null);

    const rows = await db.select({
      employeeId: schema.employees.id,
      fullName: schema.employees.fullName,
      branchId: schema.employees.branchId,
      deviceId: schema.attendanceClockDevices.id,
      activatedAt: schema.attendanceClockDevices.activatedAt,
      linkExpiresAt: schema.attendanceClockDevices.linkExpiresAt,
      lastUsedAt: schema.attendanceClockDevices.lastUsedAt,
      passkeyRegisteredAt: schema.attendanceClockDevices.passkeyRegisteredAt,
      faceIdExempt: schema.attendanceClockDevices.faceIdExempt,
    }).from(schema.employees)
      .leftJoin(schema.attendanceClockDevices, and(
        eq(schema.attendanceClockDevices.employeeId, schema.employees.id),
        isNull(schema.attendanceClockDevices.revokedAt),
      ))
      .where(and(
        eq(schema.employees.isActive, true),
        branchFilter ? eq(schema.employees.branchId, branchFilter) : undefined,
      ))
      .orderBy(asc(schema.employees.fullName));

    const now = Date.now();
    return NextResponse.json({
      people: rows.map((r) => ({
        employeeId: r.employeeId,
        fullName: r.fullName,
        branchId: r.branchId,
        deviceId: r.deviceId,
        status: !r.deviceId ? 'none'
          : r.activatedAt ? 'active'
          : (r.linkExpiresAt && r.linkExpiresAt.getTime() < now ? 'expired' : 'pending'),
        activatedAt: r.activatedAt?.toISOString() ?? null,
        lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
        faceIdRegistered: !!r.passkeyRegisteredAt,
        faceIdExempt: r.faceIdExempt ?? false,
      })),
    });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}

const createSchema = z.object({ employeeId: z.string().uuid() });

/**
 * POST /api/hr/clock/links — لینک شخصی جدید برای یک نفر. لینک/گوشی قبلی همان نفر
 * لغو می‌شود. لینک خام فقط همین یک بار برگردانده می‌شود (در دیتابیس فقط هش آن هست).
 */
export async function POST(req: Request) {
  try {
    const session = await requireSession();
    assertCan(session, 'hr.attendance.clockSetup');
    const { employeeId } = createSchema.parse(await req.json());

    const [employee] = await db.select({ id: schema.employees.id, branchId: schema.employees.branchId, isActive: schema.employees.isActive, fullName: schema.employees.fullName })
      .from(schema.employees).where(eq(schema.employees.id, employeeId)).limit(1);
    if (!employee || !employee.isActive) throw new ApiError(404, 'پرسنل فعال پیدا نشد', 'NOT_FOUND');
    assertBranch(session, employee.branchId);

    const token = newToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + LINK_TTL_HOURS * 3600_000);
    await db.transaction(async (tx) => {
      // استثنای Face ID نفر با گوشی جدید هم حفظ شود (تصمیم مدیر درباره‌ی نفر است، نه گوشی).
      const previous = await tx.update(schema.attendanceClockDevices)
        .set({ revokedAt: now, revokedBy: session.sub })
        .where(and(eq(schema.attendanceClockDevices.employeeId, employeeId), isNull(schema.attendanceClockDevices.revokedAt)))
        .returning({ faceIdExempt: schema.attendanceClockDevices.faceIdExempt });
      await tx.insert(schema.attendanceClockDevices).values({
        employeeId, linkTokenHash: hashToken(token), linkExpiresAt: expiresAt, createdBy: session.sub,
        faceIdExempt: previous.some((p) => p.faceIdExempt),
      });
    });
    void audit({ action: 'attendance.link.issued', userId: session.sub, meta: { employeeId } });
    return NextResponse.json({
      // بعد از # تا توکن هرگز به سرور/لاگ پراکسی/Referer نرسد
      path: `/clock#t=${token}`,
      employeeName: employee.fullName,
      expiresAt: expiresAt.toISOString(),
    }, { status: 201 });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
