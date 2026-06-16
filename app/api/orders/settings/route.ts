import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { getOrdSettings, updateOrdSettings } from '@/lib/ordering/settings';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  branchId: z.string().uuid(),
  isOpen: z.boolean().optional(),
  openTime: z.string().min(1).max(10).optional(),
  closeTime: z.string().min(1).max(10).optional(),
  deliveryEnabled: z.boolean().optional(),
  pickupEnabled: z.boolean().optional(),
  payCash: z.boolean().optional(),
  payOnline: z.boolean().optional(),
  payGateway: z.enum(['zarinpal', 'idpay', 'zibal']).optional(),
  zarinpalMerchantId: z.string().trim().max(100).optional(),
  idpayApiKey: z.string().trim().max(100).optional(),
  zibalMerchantId: z.string().trim().max(100).optional(),
  neshanApiKey: z.string().trim().max(200).optional(),
  minOrder: z.number().int().min(0).max(999_999_999_999).optional(),
  prepBufferMin: z.number().int().min(0).max(1440).optional(),
});

export async function GET(req: Request) {
  try {
    const session = await requireRole('SuperAdmin', 'BranchUser');
    const branchId = new URL(req.url).searchParams.get('branchId');
    if (!branchId) throw new ApiError(400, 'branchId الزامی است', 'MISSING_BRANCH');
    if (session.role === 'BranchUser' && session.branchId !== branchId) {
      throw new ApiError(403, 'شما فقط به تنظیمات شعبه‌ی خود دسترسی دارید', 'BRANCH_MISMATCH');
    }

    const settings = await getOrdSettings(branchId);
    return NextResponse.json({ settings });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireRole('SuperAdmin', 'BranchUser');
    const input = patchSchema.parse(await req.json());
    if (session.role === 'BranchUser' && session.branchId !== input.branchId) {
      throw new ApiError(403, 'شما فقط می‌توانید تنظیمات شعبه‌ی خود را ویرایش کنید', 'BRANCH_MISMATCH');
    }

    const { branchId, ...patch } = input;
    const settings = await updateOrdSettings(branchId, patch);
    return NextResponse.json({ settings });
  } catch (e) {
    return handleError(e);
  }
}
