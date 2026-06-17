import { NextResponse } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';

/**
 * GET /api/purchase-orders/suggestions?branchId=X
 *   پیشنهاد سفارش خرید برای اقلام «زیر حداقل موجودی» یک شعبه —
 *   مقدار پیشنهادی = کمبود تا حداقل (واحد طبیعی)، بهای واحد پیشنهادی = میانگین موزون فعلی.
 */
export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    if (!branchId) throw new ApiError(400, 'شعبه الزامی است', 'BRANCH_REQUIRED');
    if (session.role !== 'SuperAdmin' && session.branchId !== branchId) {
      throw new ApiError(403, 'شما فقط می‌توانید پیشنهاد سفارش شعبه‌ی خود را ببینید', 'BRANCH_MISMATCH');
    }

    const rows = await db.select({
      id: schema.invItems.id,
      name: schema.invItems.name,
      unit: schema.invItems.unit,
      basePerUnit: schema.invItems.basePerUnit,
      qtyPhysical: schema.invItems.qtyPhysical,
      minBase: schema.invItems.minBase,
      avgCostPerBase: schema.invItems.avgCostPerBase,
    })
      .from(schema.invItems)
      .where(and(
        eq(schema.invItems.branchId, branchId),
        eq(schema.invItems.isActive, true),
        sql`${schema.invItems.minBase} > 0`,
        sql`${schema.invItems.qtyPhysical} < ${schema.invItems.minBase}`,
      ));

    const items = rows.map((r) => {
      const basePerUnit = parseFloat(r.basePerUnit) || 1;
      const qtyPhysical = parseFloat(r.qtyPhysical) || 0;
      const minBase = parseFloat(r.minBase) || 0;
      const avgCostPerBase = parseFloat(r.avgCostPerBase) || 0;
      const deficitBase = minBase - qtyPhysical;
      return {
        id: r.id,
        name: r.name,
        unit: r.unit,
        currentQty: Math.round((qtyPhysical / basePerUnit) * 100) / 100,
        minQty: Math.round((minBase / basePerUnit) * 100) / 100,
        suggestedQty: Math.max(1, Math.ceil(deficitBase / basePerUnit)),
        suggestedUnitCost: Math.round(avgCostPerBase * basePerUnit),
      };
    });

    return NextResponse.json({ items });
  } catch (e) {
    return handleError(e);
  }
}
