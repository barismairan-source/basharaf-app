import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { assertCan } from '@/lib/auth/apiAccess';
import { handleErrorLogged } from '@/lib/api-error';
import { resolveClockIp } from '@/lib/attendance-clock/ip';

export const dynamic = 'force-dynamic';

/**
 * GET /api/hr/clock/my-ip — مدیر داخل مغازه این را می‌زند تا IP عمومی مغازه را
 * همان‌طور که سرور می‌بیند ببیند و ثبت کند. سرآیندهای خام هم برگردانده می‌شوند تا
 * رفتار پراکسی لیارا یک بار تأیید شود (project-docs/ATTENDANCE-CLOCK.md).
 */
export async function GET(req: Request) {
  try {
    const session = await requireSession();
    assertCan(session, 'hr.attendance.clockSetup');
    const result = resolveClockIp(req.headers);
    return NextResponse.json({
      ok: result.ok,
      ip: result.ok ? result.ip : null,
      reason: result.ok ? null : result.reason,
      headers: {
        xRealIp: req.headers.get('x-real-ip'),
        xForwardedFor: req.headers.get('x-forwarded-for'),
      },
    });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
