import { NextResponse } from 'next/server';
import { reversePayrollPost } from '@/lib/payroll/postToBasharaf';
import { requireRole } from '@/lib/auth/session';
import { handleErrorLogged } from '@/lib/api-error';
import { audit } from '@/lib/auth/audit';

export const dynamic = 'force-dynamic';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole('SuperAdmin');
    await reversePayrollPost(params.id);
    void audit({ action: 'payroll.reversed', userId: session.sub, meta: { runId: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'NO_JOURNAL_VOUCHER') {
      return NextResponse.json(
        { ok: false, code: 'NO_JOURNAL_VOUCHER', error: (e as Error).message },
        { status: 409 }
      );
    }
    return await handleErrorLogged(e, undefined, { category: 'payroll' });
  }
}
