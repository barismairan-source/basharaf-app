import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiError, handleError } from '@/lib/api-error';
import { getReservationStatusForDate } from '@/lib/reservations/publicReservations';
import { getTodayJalali } from '@/lib/jalali';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  branchId: z.string().uuid(),
  partySize: z.coerce.number().int().min(1).max(200),
  date: z.string().min(6).max(12).optional(),
  tableType: z.enum(['normal', 'social']).default('normal'),
});

/** GET /api/public/reservations/today?branchId=&partySize=&date=&tableType= — اسلات‌های یک تاریخ (پیش‌فرض امروز) برای این تعداد نفر/نوع میز. */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = querySchema.safeParse({
      branchId: url.searchParams.get('branchId'),
      partySize: url.searchParams.get('partySize'),
      date: url.searchParams.get('date') ?? undefined,
      tableType: url.searchParams.get('tableType') ?? undefined,
    });
    if (!parsed.success) throw new ApiError(400, 'پارامترها نامعتبرند', 'INVALID_QUERY');

    const date = parsed.data.date ?? getTodayJalali();
    const day = await getReservationStatusForDate(parsed.data.branchId, date, parsed.data.partySize, parsed.data.tableType);
    return NextResponse.json(day);
  } catch (e) {
    return handleError(e);
  }
}
