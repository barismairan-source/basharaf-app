import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession, requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';

const createBodySchema = z.object({
  type: z.enum(['income', 'expense']),
  name: z.string().min(2).max(40),
});

export async function GET() {
  try {
    await requireSession();
    const rows = await db.select().from(schema.categories);
    // group by type — مطابق shape CategorySet در client
    const income = rows.filter((c) => c.type === 'income');
    const expense = rows.filter((c) => c.type === 'expense');
    return NextResponse.json({ categories: { income, expense } });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const input = createBodySchema.parse(body);

    const [inserted] = await db
      .insert(schema.categories)
      .values(input)
      .returning();

    if (!inserted) {
      throw new ApiError(500, 'خطا در ایجاد دسته', 'INSERT_FAILED');
    }

    return NextResponse.json({ category: inserted }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
