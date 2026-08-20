import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiError, handleError } from '@/lib/api-error';
import { isValidJalaliString } from '@/lib/jalali';
import { getPublicReservationAvailability } from '@/lib/reservations/publicReservations';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  branchId: z.string().uuid(),
  date: z.string().refine(isValidJalaliString, 'تاریخ نامعتبر است'),
});

/** GET /api/public/reservations/availability?branchId=&date= — اسلات‌های یک روز. */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = querySchema.safeParse({
      branchId: url.searchParams.get('branchId'),
      date: url.searchParams.get('date'),
    });
    if (!parsed.success) throw new ApiError(400, 'پارامترها نامعتبرند', 'INVALID_QUERY');

    const day = await getPublicReservationAvailability(parsed.data.branchId, parsed.data.date);
    return NextResponse.json(day);
  } catch (e) {
    return handleError(e);
  }
}
