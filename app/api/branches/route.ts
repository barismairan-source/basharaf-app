import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession, requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';

const createBodySchema = z.object({
  name: z.string().min(2).max(60),
  address: z.string().min(5).max(200),
  manager: z.string().min(2).max(80),
  opened: z.string().min(1),
});

export async function GET() {
  try {
    await requireSession();
    const rows = await db.select().from(schema.branches);
    return NextResponse.json({ branches: rows });
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
      .insert(schema.branches)
      .values(input)
      .returning();

    if (!inserted) {
      throw new ApiError(500, 'خطا در ایجاد شعبه', 'INSERT_FAILED');
    }

    return NextResponse.json({ branch: inserted }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
