import { z } from 'zod';
import { NextResponse } from 'next/server';
import { createWebOtp, invalidateWebOtps, isValidIranPhone } from '@/lib/ordering/webCustomer';
import { sendOtpSms } from '@/lib/sms/otp';
import { ApiError, handleError } from '@/lib/api-error';
import { consumeRequestLimit, getClientIp, PUBLIC_LIMITS } from '@/lib/auth/rateLimit';

const schema = z.object({
  phone: z.string(),
});

export async function POST(request: Request) {
  try {
    const rl = consumeRequestLimit('otp-send', getClientIp(request), PUBLIC_LIMITS.otpSend);
    if (!rl.allowed) {
      throw new ApiError(429, `تعداد درخواست‌ها زیاد است. ${rl.retryAfter ?? 60} ثانیه دیگر تلاش کنید.`, 'RATE_LIMITED');
    }
    const body = schema.parse(await request.json());

    if (!isValidIranPhone(body.phone)) {
      throw new ApiError(422, 'شماره موبایل نامعتبر است — ۱۱ رقم و شروع با ۰', 'INVALID_PHONE');
    }

    const code = await createWebOtp(body.phone);
    // قبلاً کد فقط در دیتابیس ذخیره می‌شد و در production هرگز پیامک نمی‌شد —
    // یعنی هیچ مشتری‌ای نمی‌توانست وارد شود.
    const sent = await sendOtpSms(body.phone, code);
    if (!sent.ok) {
      // کد ارسال‌نشده را باطل کن تا ضد-اسپم مانع تلاش دوباره نشود
      await invalidateWebOtps(body.phone);
      throw new ApiError(503, 'ارسال پیامک کد ورود ناموفق بود — چند دقیقه دیگر دوباره تلاش کنید', 'OTP_SMS_FAILED');
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
