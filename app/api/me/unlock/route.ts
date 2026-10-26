import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { AuthenticationResponseJSON } from '@simplewebauthn/server';
import { handleErrorLogged } from '@/lib/api-error';
import { audit } from '@/lib/auth/audit';
import { getClientIp } from '@/lib/auth/rateLimit';
import { verifyAuthentication } from '@/lib/attendance-clock/passkey';
import { assertJsonRequest } from '@/lib/attendance-clock/service';
import { clearUnlockCookie, requireMe, setUnlockCookie, UNLOCK_TTL_SECONDS } from '@/lib/staff-panel/session';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({ assertion: z.record(z.unknown()) });

/** POST /api/me/unlock — امضای Face ID را بررسی می‌کند و قفل را ۱۰ دقیقه باز می‌کند. */
export async function POST(req: Request) {
  try {
    assertJsonRequest(req);
    const device = await requireMe();
    const { assertion } = bodySchema.parse(await req.json());
    await verifyAuthentication(req, device.deviceId, assertion as unknown as AuthenticationResponseJSON);
    await setUnlockCookie(device.deviceId);
    void audit({ action: 'staff.panel.unlocked', ip: getClientIp(req), meta: { employeeId: device.employeeId, deviceId: device.deviceId } });
    return NextResponse.json({ ok: true, expiresInSeconds: UNLOCK_TTL_SECONDS });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}

/** DELETE /api/me/unlock — قفل را فوراً می‌بندد. */
export async function DELETE() {
  clearUnlockCookie();
  return NextResponse.json({ ok: true });
}
