import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiError, handleError } from '@/lib/api-error';
import { normalizeIranPhone } from '@/lib/sms/phone';
import { checkRateLimit, recordFailedAttempt, getClientIp } from '@/lib/auth/rateLimit';
import { cancelPublicReservation } from '@/lib/reservations/publicReservations';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, 'کد پیگیری نامعتبر است'),
  phone: z.string().trim(),
});

/** POST /api/public/reservations/cancel — لغو رزرو توسط خود مهمان (بدون auth). */
export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rl = checkRateLimit(ip);
    if (!rl.allowed) {
      throw new ApiError(429, `تعداد درخواست‌ها زیاد است. ${rl.retryAfter ?? 60} ثانیه دیگر تلاش کنید.`, 'RATE_LIMITED');
    }

    const parsed = bodySchema.parse(await req.json());
    const phone = normalizeIranPhone(parsed.phone);
    if (!phone) {
      recordFailedAttempt(ip);
      throw new ApiError(400, 'شماره موبایل نامعتبر است', 'INVALID_PHONE');
    }

    recordFailedAttempt(ip);
    await cancelPublicReservation(parsed.code, phone);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
