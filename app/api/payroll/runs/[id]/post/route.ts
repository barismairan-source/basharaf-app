import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/session';
import { handleErrorLogged } from '@/lib/api-error';
import { postPayrollRunToBasharaf, reversePayrollPost } from '@/lib/payroll/postToBasharaf';
import { audit } from '@/lib/auth/audit';

export const dynamic = 'force-dynamic';

const postSchema = z.object({
  accountId: z.string().uuid('شناسه صندوق نامعتبر است'),
  date: z.string().min(1, 'تاریخ الزامی است'),
});

/**
 * POST /api/payroll/runs/[id]/post
 * یک اجرای حقوق تأییدشده را به حسابداری هسته ثبت می‌کند.
 * فقط SuperAdmin.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAdmin();
    const body = await req.json();
    const { accountId, date } = postSchema.parse(body);

    const result = await postPayrollRunToBasharaf(params.id, accountId, session.sub, date);
    if (!result.alreadyPosted) {
      void audit({ action: 'payroll.posted', userId: session.sub, meta: { runId: params.id, accountId, date } });
    }
    return NextResponse.json(result, { status: result.alreadyPosted ? 200 : 201 });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}

/**
 * DELETE /api/payroll/runs/[id]/post
 * post را معکوس می‌کند (در صورت اشتباه).
 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAdmin();
    const result = await reversePayrollPost(params.id);
    void audit({ action: 'payroll.reversed', userId: session.sub, meta: { runId: params.id } });
    return NextResponse.json(result);
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
