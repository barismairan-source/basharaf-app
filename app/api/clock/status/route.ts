import { NextResponse } from 'next/server';
import { ApiError, handleError } from '@/lib/api-error';
import { consumeRequestLimit, getClientIp } from '@/lib/auth/rateLimit';
import { resolveClockIp } from '@/lib/attendance-clock/ip';
import { anyNetworkConfigured, getClockState, getDeviceFromCookie, matchBranchNetwork } from '@/lib/attendance-clock/service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/clock/status — وضعیت همین گوشی: چه کسی است، الان داخل است یا نه،
 * و آیا به اینترنت مغازه وصل است. IPی که سرور دیده هم برگردانده می‌شود
 * (فقط IP خودِ درخواست‌دهنده — برای عیب‌یابی «وصل نیستم»).
 */
export async function GET(req: Request) {
  try {
    // همه‌ی پرسنل یک شعبه پشت یک IP هستند — سقف سخاوتمندانه.
    const rl = consumeRequestLimit('clock-status', getClientIp(req), { max: 600, windowMs: 15 * 60 * 1000 });
    if (!rl.allowed) throw new ApiError(429, 'تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره امتحان کنید.', 'RATE_LIMITED');

    const device = await getDeviceFromCookie();
    const ipResult = resolveClockIp(req.headers);
    const now = new Date();

    let network: { ok: boolean; branchName: string | null; reason: string | null } = { ok: false, branchName: null, reason: null };
    if (!ipResult.ok) {
      network.reason = 'IP_UNCERTAIN';
    } else if (!(await anyNetworkConfigured())) {
      network.reason = 'NOT_CONFIGURED';
    } else {
      const match = await matchBranchNetwork(ipResult.ip, device?.employeeBranchId ?? null);
      network = match ? { ok: true, branchName: match.branchName, reason: null } : { ok: false, branchName: null, reason: 'OFF_NETWORK' };
    }

    if (!device) {
      return NextResponse.json({ device: null, network, ip: ipResult.ok ? ipResult.ip : null, serverTime: now.toISOString() });
    }
    const state = await getClockState(device.employeeId, now);
    return NextResponse.json({
      device: { employeeName: device.employeeName },
      state: state.kind === 'out' ? { kind: 'out' } : { kind: state.kind, since: state.since.toISOString() },
      network,
      ip: ipResult.ok ? ipResult.ip : null,
      serverTime: now.toISOString(),
    });
  } catch (e) {
    return handleError(e);
  }
}
