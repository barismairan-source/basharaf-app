import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiError, handleError } from '@/lib/api-error';
import { getTodayReservationStatus } from '@/lib/reservations/publicReservations';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  branchId: z.string().uuid(),
  partySize: z.coerce.number().int().min(1).max(200),
});

/** GET /api/public/reservations/today?branchId=&partySize= — اسلات‌های امروز (ناهار/شام) برای این تعداد نفر. */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = querySchema.safeParse({
      branchId: url.searchParams.get('branchId'),
      partySize: url.searchParams.get('partySize'),
    });
    if (!parsed.success) throw new ApiError(400, 'پارامترها نامعتبرند', 'INVALID_QUERY');

    const today = await getTodayReservationStatus(parsed.data.branchId, parsed.data.partySize);
    return NextResponse.json(today);
  } catch (e) {
    return handleError(e);
  }
}
