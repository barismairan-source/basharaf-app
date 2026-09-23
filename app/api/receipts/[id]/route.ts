import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { handleError } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

/** GET /api/receipts/[id] — عمومی، بدون نیاز به ورود؛ همان لینکی که مشتری باز می‌کند. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const [row] = await db.select().from(schema.receipts).where(eq(schema.receipts.id, params.id));
    if (!row) return NextResponse.json({ error: 'فیش پیدا نشد' }, { status: 404 });
    return NextResponse.json({
      customerName: row.customerName,
      items: row.items,
      createdAt: row.createdAt,
    });
  } catch (e) {
    return handleError(e);
  }
}
