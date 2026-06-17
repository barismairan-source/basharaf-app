import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { rowToInvVoucher } from '@/lib/db/inventory.serializers';
import { produceConfirmed } from '@/lib/db/inventoryHelpers';
import { audit } from '@/lib/auth/audit';

/**
 * POST /api/inventory/produce — تولید نیمه‌آماده.
 * مواد خام را (با میانگین موزون) کم و نیمه‌آماده را اضافه می‌کند، اتمیک.
 * یک برگه‌ی approved از نوع produce هم برای رد ثبت می‌سازد.
 * body: { itemId, batches, date }
 */

const bodySchema = z.object({
  itemId: z.string().uuid(),
  batches: z.number().int().min(1),
  date: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const input = bodySchema.parse(await req.json());

    const [item] = await db.select().from(schema.invItems)
      .where(eq(schema.invItems.id, input.itemId)).limit(1);
    if (!item) throw new ApiError(404, 'قلم پیدا نشد', 'ITEM_NOT_FOUND');
    if (item.kind !== 'prep') throw new ApiError(400, 'فقط نیمه‌آماده قابل تولید است', 'NOT_PREP');

    if (session.role === 'BranchUser' && item.branchId !== session.branchId) {
      throw new ApiError(403, 'دسترسی شعبه', 'BRANCH_MISMATCH');
    }

    const result = await db.transaction(async (dbTx) => {
      const { producedBase, totalCost } = await produceConfirmed(dbTx, input.itemId, input.batches);

      const no = `P-${input.date.replace(/[^0-9]/g, '').slice(0, 6)}-${Date.now().toString().slice(-4)}`;
      const [v] = await dbTx.insert(schema.invVouchers).values({
        no,
        kind: 'produce',
        status: 'approved',
        branchId: item.branchId,
        estTotal: totalCost,
        finalTotal: totalCost,
        note: `تولید ${input.batches} بَچ ${item.name}`,
        createdBy: session.sub,
        makerDate: input.date,
        approvedBy: session.sub,
        approvedAt: new Date(),
      }).returning();
      if (!v) throw new ApiError(500, 'خطا در ساخت برگه تولید', 'INSERT_FAILED');

      await dbTx.insert(schema.invStockTx).values({
        itemId: input.itemId,
        voucherId: v.id,
        kind: 'produce',
        deltaBase: String(producedBase),
        value: totalCost,
        note: `تولید ${input.batches} بَچ`,
        jalaliDate: input.date,
      });

      return { v, producedBase, totalCost };
    });

    audit({ action: 'inv.produce', userId: session.sub, meta: { itemId: input.itemId, batches: input.batches } });
    return NextResponse.json({ voucher: rowToInvVoucher(result.v, []) }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
