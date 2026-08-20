import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiError, handleError } from '@/lib/api-error';
import { normalizeIranPhone } from '@/lib/sms/phone';
import { checkRateLimit, recordFailedAttempt, getClientIp } from '@/lib/auth/rateLimit';
import { getPublicReservationByCodeAndPhone } from '@/lib/reservations/publicReservations';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, 'کد پیگیری نامعتبر است'),
  phone: z.string().trim(),
});

/**
 * GET /api/public/reservations/track?code=&phone= — پیگیری رزرو (بدون auth).
 * هر دو کد + شماره باید مطابقت داشته باشند — جلوگیری از حدس‌زدن کد ۶رقمی.
 * Rate-limit per IP — کد کوتاه است، بدون این محدودیت brute-force امکان‌پذیر می‌شود.
 */
export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    const rl = checkRateLimit(ip);
    if (!rl.allowed) {
      throw new ApiError(429, `تعداد درخواست‌ها زیاد است. ${rl.retryAfter ?? 60} ثانیه دیگر تلاش کنید.`, 'RATE_LIMITED');
    }

    const url = new URL(req.url);
    const parsed = querySchema.safeParse({
      code: url.searchParams.get('code'),
      phone: url.searchParams.get('phone'),
    });
    const phone = parsed.success ? normalizeIranPhone(parsed.data.phone) : null;
    if (!parsed.success || !phone) {
      recordFailedAttempt(ip);
      throw new ApiError(400, 'کد یا شماره نامعتبر است', 'INVALID_QUERY');
    }

    const detail = await getPublicReservationByCodeAndPhone(parsed.data.code, phone);
    if (!detail) {
      recordFailedAttempt(ip);
      throw new ApiError(404, 'رزرو پیدا نشد — کد و شماره را بررسی کنید', 'NOT_FOUND');
    }
    return NextResponse.json({ reservation: detail });
  } catch (e) {
    return handleError(e);
  }
}
