import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { stocktakeConfirmed } from '@/lib/db/inventoryHelpers';
import { audit } from '@/lib/auth/audit';

/**
 * POST /api/inventory/stocktake — انبارگردانی.
 * موجودی قطعی را با شمارش فیزیکی تطبیق می‌دهد (مغایرت مثبت=مازاد، منفی=کسری).
 * body: { itemId, countedBase, note?, date? }
 */

const bodySchema = z.object({
  itemId: z.string().uuid(),
  countedBase: z.number().min(0),
  note: z.string().max(500).optional().default(''),
  date: z.string().min(1).optional(),
});

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const input = bodySchema.parse(await req.json());

    const [item] = await db.select().from(schema.invItems)
      .where(eq(schema.invItems.id, input.itemId)).limit(1);
    if (!item) throw new ApiError(404, 'قلم پیدا نشد', 'ITEM_NOT_FOUND');
    if (session.role === 'BranchUser' && item.branchId !== session.branchId) {
      throw new ApiError(403, 'دسترسی شعبه', 'BRANCH_MISMATCH');
    }

    const jalali = input.date ?? new Date().toISOString().slice(0, 10);

    const { diff } = await db.transaction(async (dbTx) => {
      const r = await stocktakeConfirmed(dbTx, input.itemId, input.countedBase);
      if (Math.abs(r.diff) > 1e-6) {
        await dbTx.insert(schema.invStockTx).values({
          itemId: input.itemId,
          kind: 'stocktake',
          deltaBase: String(r.diff),
          value: Math.round(r.diff * parseFloat(item.avgCostPerBase)),
          note: input.note || 'انبارگردانی',
          jalaliDate: jalali,
        });
      }
      return r;
    });

    audit({ action: 'inv.stocktake', userId: session.sub, meta: { itemId: input.itemId, diff } });
    return NextResponse.json({ ok: true, diff });
  } catch (e) {
    return handleError(e);
  }
}
