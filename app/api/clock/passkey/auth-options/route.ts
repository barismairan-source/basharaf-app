import { NextResponse } from 'next/server';
import { ApiError, handleErrorLogged } from '@/lib/api-error';
import { consumeRequestLimit } from '@/lib/auth/rateLimit';
import { beginAuthentication } from '@/lib/attendance-clock/passkey';
import { assertJsonRequest, faceIdRequiredFor, getDeviceFromCookie } from '@/lib/attendance-clock/service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/clock/passkey/auth-options — پیش از هر ورود/خروج: اگر Face ID لازم است،
 * challenge یک‌بارمصرف می‌دهد؛ اگر لازم نیست { required: false }.
 */
export async function POST(req: Request) {
  try {
    assertJsonRequest(req);
    const device = await getDeviceFromCookie();
    if (!device) throw new ApiError(401, 'این گوشی برای ثبت حضور فعال نشده است.', 'NO_DEVICE');
    if (!(await faceIdRequiredFor(device))) return NextResponse.json({ required: false });
    const rl = consumeRequestLimit('clock-passkey', device.deviceId, { max: 20, windowMs: 10 * 60 * 1000 });
    if (!rl.allowed) throw new ApiError(429, 'تعداد تلاش‌ها زیاد است؛ چند دقیقه بعد دوباره امتحان کنید.', 'RATE_LIMITED');
    return NextResponse.json({ required: true, options: await beginAuthentication(device.deviceId) });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
