import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiError, handleError } from '@/lib/api-error';
import { getTodayReservationStatus } from '@/lib/reservations/publicReservations';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  branchId: z.string().uuid(),
});

/** GET /api/public/reservations/today?branchId= — وضعیت باز/بسته و ظرفیت باقی‌مانده‌ی امروز. */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = querySchema.safeParse({ branchId: url.searchParams.get('branchId') });
    if (!parsed.success) throw new ApiError(400, 'پارامترها نامعتبرند', 'INVALID_QUERY');

    const today = await getTodayReservationStatus(parsed.data.branchId);
    return NextResponse.json(today);
  } catch (e) {
    return handleError(e);
  }
}
