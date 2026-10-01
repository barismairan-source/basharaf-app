import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiError, handleError } from '@/lib/api-error';
import { normalizeIranPhone } from '@/lib/sms/phone';
import { consumeRequestLimit, getClientIp, PUBLIC_LIMITS } from '@/lib/auth/rateLimit';
import { createPublicReservation } from '@/lib/reservations/publicReservations';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  branchId: z.string().uuid(),
  date: z.string().min(6).max(12),
  bookerName: z.string().trim().min(2, 'نام رزروکننده را کامل وارد کنید').max(80).optional(),
  guestName: z.string().trim().min(2, 'نام را کامل وارد کنید').max(80),
  guestPhone: z.string().trim().transform((v, ctx) => {
    const normalized = normalizeIranPhone(v);
    if (!normalized) {
      ctx.addIssue({ code: 'custom', message: 'شماره موبایل نامعتبر است (مثال: 0912xxxxxxx)' });
      return z.NEVER;
    }
    return normalized;
  }),
  time: z.string().regex(/^\d{1,2}:\d{2}$/, 'ساعت نامعتبر است'),
  partySize: z.number().int().positive().max(100),
  tableType: z.enum(['normal', 'social']),
  note: z.string().trim().max(300).optional(),
  idempotencyKey: z.string().max(100).optional(),
});

/**
 * POST /api/public/reservations/create — ثبت رزرو عمومی (بدون auth).
 * Rate-limit ساده per IP — همان الگوی POST /api/recruitment.
 */
export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rl = consumeRequestLimit('reservation-create', ip, PUBLIC_LIMITS.reservationCreate);
    if (!rl.allowed) {
      throw new ApiError(429, `تعداد درخواست‌ها زیاد است. ${rl.retryAfter ?? 60} ثانیه دیگر تلاش کنید.`, 'RATE_LIMITED');
    }

    const input = bodySchema.parse(await req.json());

    const result = await createPublicReservation(input);
    return NextResponse.json({ reservation: result }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
