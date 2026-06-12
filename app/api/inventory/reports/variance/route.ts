// GET /api/inventory/reports/variance?branchId=X&dateFrom=1403-01-01&dateTo=1403-01-31
import { NextResponse } from 'next/server';
import { and, eq, gte, lte, inArray, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';
import { jalaliToDate } from '@/lib/jalali';

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    if (!branchId || !dateFrom || !dateTo) {
      return NextResponse.json({ error: 'پارامترهای ناقص' }, { status: 400 });
    }

    const from = jalaliToDate(dateFrom);
    const to = jalaliToDate(dateTo);
    if (!from || !to) {
      return NextResponse.json({ error: 'تاریخ نامعتبر' }, { status: 400 });
    }
    // to را تا پایان روز ببریم
    to.setHours(23, 59, 59, 999);

    const SALE_KINDS = ['sale'] as const;
    const ACTUAL_KINDS = ['out', 'waste', 'sale'] as const;

    const baseWhere = and(
      eq(schema.invVouchers.branchId, branchId),
      eq(schema.invVouchers.status, 'approved'),
      gte(schema.invVouchers.updatedAt, from),
      lte(schema.invVouchers.updatedAt, to),
    );

    // مصرف تئوریک: برگه‌های sale (فروش منو با رسپی)
    const theoretical = await db
      .select({
        itemId: schema.invVoucherLines.itemId,
        qty: sql<string>`sum(${schema.invVoucherLines.qtyBase})`,
      })
      .from(schema.invVoucherLines)
      .innerJoin(schema.invVouchers, eq(schema.invVoucherLines.voucherId, schema.invVouchers.id))
      .where(and(baseWhere, inArray(schema.invVouchers.kind, [...SALE_KINDS])))
      .groupBy(schema.invVoucherLines.itemId);

    // مصرف واقعی: تمام خروجی‌های approved
    const actual = await db
      .select({
        itemId: schema.invVoucherLines.itemId,
        qty: sql<string>`sum(${schema.invVoucherLines.qtyBase})`,
      })
      .from(schema.invVoucherLines)
      .innerJoin(schema.invVouchers, eq(schema.invVoucherLines.voucherId, schema.invVouchers.id))
      .where(and(baseWhere, inArray(schema.invVouchers.kind, [...ACTUAL_KINDS])))
      .groupBy(schema.invVoucherLines.itemId);

    const itemIds = [...new Set([...theoretical.map(x => x.itemId), ...actual.map(x => x.itemId)])];
    if (itemIds.length === 0) return NextResponse.json({ rows: [] });

    const items = await db.select().from(schema.invItems).where(inArray(schema.invItems.id, itemIds));

    const thMap: Record<string, number> = {};
    for (const x of theoretical) thMap[x.itemId] = parseFloat(x.qty) || 0;
    const acMap: Record<string, number> = {};
    for (const x of actual) acMap[x.itemId] = parseFloat(x.qty) || 0;

    const rows = items.map(item => {
      const theoreticalQty = thMap[item.id] ?? 0;
      const actualQty = acMap[item.id] ?? 0;
      const varianceQty = actualQty - theoreticalQty;
      const avgCost = parseFloat(item.avgCostPerBase as string) || 0;
      const varianceCost = Math.round(varianceQty * avgCost);
      return {
        itemId: item.id,
        itemName: item.name,
        unit: item.unit,
        theoreticalQty,
        actualQty,
        varianceQty,
        varianceCost,
        avgCost,
      };
    });

    rows.sort((a, b) => Math.abs(b.varianceCost) - Math.abs(a.varianceCost));
    return NextResponse.json({ rows });
  } catch (e) {
    return handleError(e);
  }
}
