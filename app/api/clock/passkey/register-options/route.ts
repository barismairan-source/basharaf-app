import { NextResponse } from 'next/server';
import { ApiError, handleErrorLogged } from '@/lib/api-error';
import { consumeRequestLimit } from '@/lib/auth/rateLimit';
import { beginRegistration } from '@/lib/attendance-clock/passkey';
import { assertJsonRequest, getDeviceFromCookie } from '@/lib/attendance-clock/service';

export const dynamic = 'force-dynamic';

/** POST /api/clock/passkey/register-options — شروع فعال‌سازی Face ID روی همین گوشی (یک بار). */
export async function POST(req: Request) {
  try {
    assertJsonRequest(req);
    const device = await getDeviceFromCookie();
    if (!device) throw new ApiError(401, 'این گوشی برای ثبت حضور فعال نشده است.', 'NO_DEVICE');
    const rl = consumeRequestLimit('clock-passkey', device.deviceId, { max: 20, windowMs: 10 * 60 * 1000 });
    if (!rl.allowed) throw new ApiError(429, 'تعداد تلاش‌ها زیاد است؛ چند دقیقه بعد دوباره امتحان کنید.', 'RATE_LIMITED');
    return NextResponse.json({ options: await beginRegistration(req, device) });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
