import { NextResponse } from 'next/server';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { ApiError, handleError } from '@/lib/api-error';
import { consumeRequestLimit, getClientIp } from '@/lib/auth/rateLimit';
import { audit } from '@/lib/auth/audit';
import { assertJsonRequest, getDeviceFromCookie, hashToken, newToken, setClockCookie } from '@/lib/attendance-clock/service';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({ token: z.string().min(20).max(200) });

/**
 * POST /api/clock/activate — لینک شخصی (یک‌بارمصرف) را روی همین گوشی فعال می‌کند.
 * لینک بعد از اولین استفاده دیگر کار نمی‌کند؛ گوشی یک کلید جدا در کوکی httpOnly می‌گیرد.
 * فعال‌سازی به شبکه‌ی مغازه وابسته نیست (مدیر ممکن است لینک را جای دیگری بدهد)؛
 * خودِ ثبت ورود/خروج است که فقط از اینترنت مغازه پذیرفته می‌شود.
 */
export async function POST(req: Request) {
  try {
    const rl = consumeRequestLimit('clock-activate', getClientIp(req), { max: 30, windowMs: 60 * 60 * 1000 });
    if (!rl.allowed) throw new ApiError(429, 'تعداد تلاش‌ها زیاد است؛ کمی بعد دوباره امتحان کنید.', 'RATE_LIMITED');

    assertJsonRequest(req);
    const { token } = bodySchema.parse(await req.json());
    const deviceToken = newToken();
    const now = new Date();
    // همان گوشی‌ای که قبلاً با همین لینک فعال شده (مثلاً لینک قدیمی را دوباره از پیام باز کرده)
    const currentDevice = await getDeviceFromCookie();

    const activated = await db.transaction(async (tx) => {
      const [link] = await tx.select({
        id: schema.attendanceClockDevices.id,
        employeeId: schema.attendanceClockDevices.employeeId,
        activatedAt: schema.attendanceClockDevices.activatedAt,
        linkExpiresAt: schema.attendanceClockDevices.linkExpiresAt,
        employeeName: schema.employees.fullName,
        employeeActive: schema.employees.isActive,
      }).from(schema.attendanceClockDevices)
        .innerJoin(schema.employees, eq(schema.attendanceClockDevices.employeeId, schema.employees.id))
        .where(and(
          eq(schema.attendanceClockDevices.linkTokenHash, hashToken(token)),
          isNull(schema.attendanceClockDevices.revokedAt),
        ))
        .for('update', { of: schema.attendanceClockDevices })
        .limit(1);

      if (!link || !link.employeeActive) {
        throw new ApiError(404, 'این لینک معتبر نیست یا لغو شده است. از مدیر لینک جدید بگیرید.', 'LINK_INVALID');
      }
      if (link.activatedAt && currentDevice?.deviceId === link.id) {
        return { ...link, alreadyActive: true };
      }
      if (link.activatedAt) {
        throw new ApiError(409, 'این لینک قبلاً روی یک گوشی فعال شده است. اگر گوشی را عوض کرده‌اید، از مدیر لینک جدید بگیرید.', 'LINK_USED');
      }
      if (link.linkExpiresAt.getTime() < now.getTime()) {
        throw new ApiError(410, 'مهلت این لینک تمام شده است. از مدیر لینک جدید بگیرید.', 'LINK_EXPIRED');
      }
      await tx.update(schema.attendanceClockDevices)
        .set({ deviceTokenHash: hashToken(deviceToken), activatedAt: now })
        .where(eq(schema.attendanceClockDevices.id, link.id));
      return { ...link, alreadyActive: false };
    });

    if (activated.alreadyActive) {
      return NextResponse.json({ employeeName: activated.employeeName, alreadyActive: true });
    }
    await setClockCookie(deviceToken);
    void audit({ action: 'attendance.clock.activated', ip: getClientIp(req), meta: { employeeId: activated.employeeId, deviceId: activated.id } });
    return NextResponse.json({ employeeName: activated.employeeName });
  } catch (e) {
    return handleError(e);
  }
}
