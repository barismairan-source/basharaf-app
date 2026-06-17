import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { getOrdZone, updateOrdZone, deleteOrdZone } from '@/lib/ordering/zones';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  deliveryFee: z.number().int().min(0).max(999_999_999_999).optional(),
  minOrder: z.number().int().min(0).max(999_999_999_999).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole('SuperAdmin', 'BranchUser');
    const input = patchSchema.parse(await req.json());

    const existing = await getOrdZone(params.id);
    if (!existing) throw new ApiError(404, 'محدوده پیدا نشد', 'NOT_FOUND');
    if (session.role === 'BranchUser' && session.branchId !== existing.branchId) {
      throw new ApiError(403, 'شما فقط می‌توانید محدوده‌های شعبه‌ی خود را ویرایش کنید', 'BRANCH_MISMATCH');
    }

    const zone = await updateOrdZone(params.id, input);
    if (!zone) throw new ApiError(404, 'محدوده پیدا نشد', 'NOT_FOUND');
    return NextResponse.json({ zone });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole('SuperAdmin', 'BranchUser');

    const existing = await getOrdZone(params.id);
    if (!existing) throw new ApiError(404, 'محدوده پیدا نشد', 'NOT_FOUND');
    if (session.role === 'BranchUser' && session.branchId !== existing.branchId) {
      throw new ApiError(403, 'شما فقط می‌توانید محدوده‌های شعبه‌ی خود را حذف کنید', 'BRANCH_MISMATCH');
    }

    await deleteOrdZone(params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
