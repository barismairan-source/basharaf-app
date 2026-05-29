import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession, requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';

const createSchema = z.object({
  name: z.string().min(2).max(80).transform(v => v.trim()),
  type: z.enum(['cash', 'bank', 'pos']).default('cash'),
  branchId: z.string().uuid().nullable().optional(),
});

export async function GET() {
  try {
    await requireSession();
    const rows = await db
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.isActive, true));
    return NextResponse.json({
      accounts: rows.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        balance: Number(a.balance), // BigInt fix
        isActive: a.isActive,
        branchId: a.branchId,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const input = createSchema.parse(body);

    const [inserted] = await db
      .insert(schema.accounts)
      .values({ name: input.name, type: input.type, branchId: input.branchId ?? null })
      .returning();

    if (!inserted) throw new ApiError(500, 'خطا در ساخت حساب', 'INSERT_FAILED');

    return NextResponse.json({
      account: {
        id: inserted.id,
        name: inserted.name,
        type: inserted.type,
        balance: Number(inserted.balance),
        isActive: inserted.isActive,
        branchId: inserted.branchId,
        createdAt: inserted.createdAt.toISOString(),
        updatedAt: inserted.updatedAt.toISOString(),
      }
    }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
