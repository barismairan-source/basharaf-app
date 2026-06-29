import { NextResponse } from 'next/server';
import { reversePayrollPost } from '@/lib/payroll/postToBasharaf';
import { requireRole } from '@/lib/auth/session';
import { handleErrorLogged } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole('SuperAdmin');
    await reversePayrollPost(params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return await handleErrorLogged(e, undefined, { category: 'payroll' });
  }
}
