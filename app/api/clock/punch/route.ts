import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { AuthenticationResponseJSON } from '@simplewebauthn/server';
import { ApiError, handleErrorLogged } from '@/lib/api-error';
import { consumeRequestLimit, getClientIp } from '@/lib/auth/rateLimit';
import { audit } from '@/lib/auth/audit';
import { resolveClockIp } from '@/lib/attendance-clock/ip';
import { verifyAuthentication } from '@/lib/attendance-clock/passkey';
import {
  anyNetworkConfigured, faceIdRequiredFor, findPunchByKey, getDeviceFromCookie, matchBranchNetwork, recordPunch,
} from '@/lib/attendance-clock/service';

export const dynamic = 'force-dynamic';

// عمداً هیچ زمان، IP یا شعبه‌ای از کلاینت پذیرفته نمی‌شود — فقط «ورود یا خروج»، کلید
// ضدتکرار و (اگر لازم باشد) امضای Face ID.
const bodySchema = z.object({
  action: z.enum(['clock_in', 'clock_out']),
  key: z.string().uuid(),
  assertion: z.record(z.unknown()).optional(),
});

/**
 * POST /api/clock/punch — ثبت ورود/خروج. فقط وقتی پذیرفته می‌شود که:
 * ۱) این گوشی با لینک شخصی فعال شده باشد (کوکی)،
 * ۲) درخواست از IP ثبت‌شده‌ی یکی از شعبه‌ها آمده باشد،
 * ۳) اگر تنظیم «Face ID» روشن است، صاحب گوشی با Face ID/اثر انگشت تأیید کرده باشد،
 * ۴) ترتیب درست باشد (ورود → خروج). زمان = ساعت سرور.
 */
export async function POST(req: Request) {
  try {
    const device = await getDeviceFromCookie();
    if (!device) {
      throw new ApiError(401, 'این گوشی برای ثبت حضور فعال نشده است. لینک شخصی را از مدیر بگیرید.', 'NO_DEVICE');
    }
    const rl = consumeRequestLimit('clock-punch', device.deviceId, { max: 20, windowMs: 10 * 60 * 1000 });
    if (!rl.allowed) throw new ApiError(429, 'تعداد تلاش‌ها زیاد است؛ چند دقیقه بعد دوباره امتحان کنید.', 'RATE_LIMITED');

    const input = bodySchema.parse(await req.json());

    const ipResult = resolveClockIp(req.headers);
    if (!ipResult.ok) {
      void audit({ action: 'attendance.clock.rejected', ip: getClientIp(req), meta: { employeeId: device.employeeId, reason: `IP_${ipResult.reason}`, realIp: ipResult.realIp, forwardedIp: ipResult.forwardedIp } });
      throw new ApiError(403, 'نشانی اینترنت شما قابل تشخیص نیست. VPN را خاموش کنید و دوباره امتحان کنید.', 'IP_UNCERTAIN');
    }
    const network = await matchBranchNetwork(ipResult.ip, device.employeeBranchId);
    if (!network) {
      const configured = await anyNetworkConfigured();
      void audit({ action: 'attendance.clock.rejected', ip: ipResult.ip, meta: { employeeId: device.employeeId, reason: configured ? 'OFF_NETWORK' : 'NOT_CONFIGURED' } });
      if (!configured) {
        throw new ApiError(503, 'ثبت حضور با اینترنت مغازه هنوز راه‌اندازی نشده است. به مدیر بگویید.', 'NOT_CONFIGURED');
      }
      throw new ApiError(403, 'فقط با وای‌فای مغازه می‌شود حضور زد. به وای‌فای مغازه وصل شوید، VPN را خاموش کنید و دوباره امتحان کنید.', 'OFF_NETWORK');
    }

    // تلاش دوباره با همان کلید (جواب قبلی به گوشی نرسیده بود): همان ثبت را برگردان، بدون
    // تأیید دوباره‌ی Face ID — امضای قبلی یک‌بارمصرف بود و ثبت اصلی با آن تأیید شده است.
    const previous = await findPunchByKey(device.deviceId, input.key);
    if (previous) {
      return NextResponse.json({
        eventType: previous.eventType, occurredAt: previous.occurredAt.toISOString(),
        branchName: network.branchName, duplicate: true,
      });
    }

    let userVerified = false;
    if (await faceIdRequiredFor(device)) {
      if (!device.passkeyRegistered) {
        throw new ApiError(428, 'اول Face ID / اثر انگشت را برای این گوشی فعال کنید.', 'PASSKEY_NOT_REGISTERED');
      }
      if (!input.assertion) throw new ApiError(401, 'تأیید Face ID لازم است.', 'PASSKEY_REQUIRED');
      try {
        await verifyAuthentication(req, device.deviceId, input.assertion as unknown as AuthenticationResponseJSON);
      } catch (e) {
        void audit({ action: 'attendance.clock.rejected', ip: ipResult.ip, meta: { employeeId: device.employeeId, reason: e instanceof ApiError ? e.code : 'PASSKEY_ERROR' } });
        throw e;
      }
      userVerified = true;
    }

    const result = await recordPunch({ device, network, action: input.action, clientKey: input.key, userVerified });
    return NextResponse.json({
      eventType: result.eventType,
      occurredAt: result.occurredAt.toISOString(),
      branchName: result.branchName,
      duplicate: result.duplicate,
    }, { status: result.duplicate ? 200 : 201 });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
