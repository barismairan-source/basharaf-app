import { NextResponse } from 'next/server';
import { ApiError, handleErrorLogged } from '@/lib/api-error';
import { consumeRequestLimit } from '@/lib/auth/rateLimit';
import { beginAuthentication } from '@/lib/attendance-clock/passkey';
import { assertJsonRequest } from '@/lib/attendance-clock/service';
import { requireMe } from '@/lib/staff-panel/session';

export const dynamic = 'force-dynamic';

/** POST /api/me/unlock/options — شروع تأیید Face ID برای دیدن اطلاعات حساس (challenge یک‌بارمصرف). */
export async function POST(req: Request) {
  try {
    assertJsonRequest(req);
    const device = await requireMe();
    const rl = consumeRequestLimit('me-unlock', device.deviceId, { max: 20, windowMs: 10 * 60 * 1000 });
    if (!rl.allowed) throw new ApiError(429, 'تعداد تلاش‌ها زیاد است؛ چند دقیقه بعد دوباره امتحان کنید.', 'RATE_LIMITED');
    return NextResponse.json({ options: await beginAuthentication(device.deviceId) });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
