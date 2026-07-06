import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';
import { getFlashReport } from '@/lib/reports/flashReport';
import { getTodayJalali } from '@/lib/jalali';

const querySchema = z.object({
  date: z.string().optional(),
  branchId: z.string().uuid().optional(),
});

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const url = new URL(req.url);

    const params = querySchema.parse({
      date: url.searchParams.get('date') ?? undefined,
      branchId: url.searchParams.get('branchId') ?? undefined,
    });

    const dateJalali = params.date ?? getTodayJalali();

    let branchId = params.branchId;
    if (session.role === 'BranchUser' && session.branchId) {
      branchId = session.branchId;
    }

    const data = await getFlashReport(dateJalali, branchId);
    return NextResponse.json(data);
  } catch (e) {
    return handleError(e);
  }
}
