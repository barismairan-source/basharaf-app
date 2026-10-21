import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { RegistrationResponseJSON } from '@simplewebauthn/server';
import { ApiError, handleErrorLogged } from '@/lib/api-error';
import { audit } from '@/lib/auth/audit';
import { getClientIp } from '@/lib/auth/rateLimit';
import { finishRegistration } from '@/lib/attendance-clock/passkey';
import { assertJsonRequest, getDeviceFromCookie } from '@/lib/attendance-clock/service';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({ response: z.record(z.unknown()) });

/** POST /api/clock/passkey/register — پایان فعال‌سازی Face ID؛ فقط کلید عمومی ذخیره می‌شود. */
export async function POST(req: Request) {
  try {
    const device = await getDeviceFromCookie();
    if (!device) throw new ApiError(401, 'این گوشی برای ثبت حضور فعال نشده است.', 'NO_DEVICE');
    assertJsonRequest(req);
    const { response } = bodySchema.parse(await req.json());
    await finishRegistration(req, device.deviceId, response as unknown as RegistrationResponseJSON);
    void audit({ action: 'attendance.passkey.registered', ip: getClientIp(req), meta: { employeeId: device.employeeId, deviceId: device.deviceId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
