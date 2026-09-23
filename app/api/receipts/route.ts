import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { generateShortId } from '@/lib/receipts/shortId';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  customerName: z.string().max(120).optional(),
  items: z.array(z.object({
    name: z.string().min(1).max(120),
    qty: z.number().int().min(1),
    unitPrice: z.number().min(1),
  })).min(1),
});

/** POST /api/receipts — فقط مدیر کل؛ فیش را ذخیره و یک شناسه‌ی کوتاه برمی‌گرداند. */
export async function POST(req: Request) {
  try {
    const session = await requireAdmin();
    const input = createSchema.parse(await req.json());

    // تلاش چندباره برای جلوگیری از برخورد نادر شناسه (احتمالش عملاً صفر است، ولی محکم‌کاری رایگان است).
    for (let attempt = 0; attempt < 5; attempt++) {
      const id = generateShortId();
      const existing = await db.select({ id: schema.receipts.id }).from(schema.receipts).where(eq(schema.receipts.id, id));
      if (existing.length > 0) continue;

      const [row] = await db.insert(schema.receipts).values({
        id,
        customerName: input.customerName || null,
        items: input.items,
        createdBy: session.sub,
      }).returning();
      if (!row) throw new ApiError(500, 'خطا در ساخت فیش', 'INSERT_FAILED');
      return NextResponse.json({ id: row.id }, { status: 201 });
    }
    throw new ApiError(500, 'خطا در تولید شناسه، دوباره تلاش کنید', 'ID_COLLISION');
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.issues[0]?.message ?? 'ورودی نامعتبر' }, { status: 400 });
    return handleError(e);
  }
}
