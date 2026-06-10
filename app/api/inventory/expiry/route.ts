import { NextResponse } from 'next/server';
import { isNotNull, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { jalaliToDate } from '@/lib/jalali';
import { handleError } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

/**
 * GET /api/inventory/expiry
 * اقلامی که تاریخ انقضایشان در ۳ روز آینده است (یا منقضی شده‌اند).
 * داده از inv_stock_tx.expiryDate (جلالی text) خوانده می‌شود.
 */
export async function GET() {
  try {
    await requireSession();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threeDaysLater = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);

    const txRows = await db
      .select({ itemId: schema.invStockTx.itemId, expiryDate: schema.invStockTx.expiryDate })
      .from(schema.invStockTx)
      .where(isNotNull(schema.invStockTx.expiryDate));

    const itemRows = await db
      .select({ id: schema.invItems.id, name: schema.invItems.name, unit: schema.invItems.unit })
      .from(schema.invItems)
      .where(eq(schema.invItems.isActive, true));

    const itemsById = new Map(itemRows.map(i => [i.id, i]));

    const seen = new Set<string>();
    const warnings: Array<{
      itemId: string; itemName: string; unit: string;
      expiryDate: string; daysUntilExpiry: number; isExpired: boolean;
    }> = [];

    for (const tx of txRows) {
      if (!tx.expiryDate) continue;
      const key = `${tx.itemId}::${tx.expiryDate}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const expiryDateObj = jalaliToDate(tx.expiryDate);
      if (!expiryDateObj) continue;
      expiryDateObj.setHours(0, 0, 0, 0);

      if (expiryDateObj > threeDaysLater) continue;

      const item = itemsById.get(tx.itemId);
      if (!item) continue;

      const diffMs = expiryDateObj.getTime() - today.getTime();
      const daysUntilExpiry = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

      warnings.push({
        itemId: tx.itemId,
        itemName: item.name,
        unit: item.unit,
        expiryDate: tx.expiryDate,
        daysUntilExpiry,
        isExpired: daysUntilExpiry <= 0,
      });
    }

    warnings.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

    return NextResponse.json({ warnings });
  } catch (e) {
    return handleError(e);
  }
}
