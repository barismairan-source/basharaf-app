import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';

const patchSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  type: z.enum(['cash', 'bank', 'pos']).optional(),
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
    await db.update(schema.accounts)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(schema.accounts.id, params.id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
