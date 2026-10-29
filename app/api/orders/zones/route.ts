import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/session';
import { canUseBranch } from '@/lib/auth/apiAccess';
import { ApiError, handleError } from '@/lib/api-error';
import { listOrdZones, createOrdZone } from '@/lib/ordering/zones';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  branchId: z.string().uuid(),
  name: z.string().min(1).max(80),
  deliveryFee: z.number().int().min(0).max(999_999_999_999),
  minOrder: z.number().int().min(0).max(999_999_999_999).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(req: Request) {
  try {
    const session = await requireRole('SuperAdmin', 'BranchUser');
    const branchId = new URL(req.url).searchParams.get('branchId');
    if (!branchId) throw new ApiError(400, 'branchId الزامی است', 'MISSING_BRANCH');
    if (!canUseBranch(session, branchId)) {
      throw new ApiError(403, 'شما فقط به محدوده‌های ارسال شعبه‌ی خود دسترسی دارید', 'BRANCH_MISMATCH');
    }

    const zones = await listOrdZones(branchId);
    return NextResponse.json({ zones });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole('SuperAdmin', 'BranchUser');
    const input = createSchema.parse(await req.json());
    if (!canUseBranch(session, input.branchId)) {
      throw new ApiError(403, 'شما فقط می‌توانید برای شعبه‌ی خود محدوده تعریف کنید', 'BRANCH_MISMATCH');
    }

    const zone = await createOrdZone(input);
    return NextResponse.json({ zone }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
