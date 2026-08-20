import { NextResponse } from 'next/server';
import { handleError } from '@/lib/api-error';
import { getPublicReservationBranches } from '@/lib/reservations/publicReservations';

export const dynamic = 'force-dynamic';

/** GET /api/public/reservations/branches — شعبی که رزرو عمومی برایشان فعال است. */
export async function GET() {
  try {
    const branches = await getPublicReservationBranches();
    return NextResponse.json({ branches });
  } catch (e) {
    return handleError(e);
  }
}
