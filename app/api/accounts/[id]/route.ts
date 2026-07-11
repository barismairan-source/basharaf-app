import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';

const patchSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  type: z.enum(['cash', 'bank', 'pos', 'partner_equity']).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const input = patchSchema.parse(await req.json());
    const [updated] = await db
      .update(schema.accounts)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(schema.accounts.id, params.id))
      .returning();
    if (!updated) throw new ApiError(404, 'حساب پیدا نشد', 'NOT_FOUND');
    return NextResponse.json({ account: { ...updated, balance: Number(updated.balance) } });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const [account] = await db.select({ balance: schema.accounts.balance })
      .from(schema.accounts).where(eq(schema.accounts.id, params.id)).limit(1);
    if (!account) throw new ApiError(404, 'حساب پیدا نشد', 'NOT_FOUND');
    const balance = Number(account.balance);
    if (balance !== 0) {
      const formatted = new Intl.NumberFormat('fa-IR').format(Math.abs(balance));
      throw new ApiError(
        409,
        `این صندوق ${formatted} تومان موجودی دارد و قابل حذف نیست. ابتدا موجودی را به صفر برسانید.`,
        'NON_ZERO_BALANCE',
      );
    }
    await db.update(schema.accounts)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(schema.accounts.id, params.id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
