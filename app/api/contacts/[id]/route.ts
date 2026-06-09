import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';

const patchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  type: z.enum(['customer', 'supplier', 'other']).optional(),
  phone: z.string().max(20).nullable().optional(),
  note: z.string().max(300).nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const input = patchSchema.parse(await req.json());
    const [updated] = await db.update(schema.contacts)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(schema.contacts.id, params.id)).returning();
    if (!updated) throw new ApiError(404, 'طرف‌حساب پیدا نشد', 'NOT_FOUND');
    return NextResponse.json({ contact: { ...updated, balance: Number(updated.balance) } });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const [contact] = await db.select({ balance: schema.contacts.balance })
      .from(schema.contacts).where(eq(schema.contacts.id, params.id)).limit(1);
    if (!contact) throw new ApiError(404, 'طرف‌حساب پیدا نشد', 'NOT_FOUND');
    const balance = Number(contact.balance);
    if (balance !== 0) {
      const formatted = new Intl.NumberFormat('fa-IR').format(Math.abs(balance));
      const msg = balance > 0
        ? `این طرف‌حساب ${formatted} تومان به ما بدهکار است و قابل حذف نیست. ابتدا تسویه کنید.`
        : `این طرف‌حساب ${formatted} تومان طلب دارد و قابل حذف نیست. ابتدا تسویه کنید.`;
      throw new ApiError(409, msg, 'NON_ZERO_BALANCE');
    }
    await db.update(schema.contacts).set({ isActive: false, updatedAt: new Date() })
      .where(eq(schema.contacts.id, params.id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
