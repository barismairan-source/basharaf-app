// GET /api/inventory/items/price-changes
// خروجی: تغییر قیمت ۳ ماهه برای همه‌ی اقلام — برای ستون جدول اصلی
import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';
import { jalaliToDate } from '@/lib/jalali';

export type ItemPriceChange = {
  lastPrice: number;
  change3mPct: number | null;
};

export async function GET() {
  try {
    await requireSession();

    const rows = await db
      .select({
        itemId: schema.invVoucherLines.itemId,
        makerDate: schema.invVouchers.makerDate,
        finalUnitCost: schema.invVoucherLines.finalUnitCost,
        estUnitCost: schema.invVoucherLines.estUnitCost,
      })
      .from(schema.invVoucherLines)
      .innerJoin(schema.invVouchers, eq(schema.invVoucherLines.voucherId, schema.invVouchers.id))
      .where(
        and(
          eq(schema.invVouchers.kind, 'in'),
          eq(schema.invVouchers.status, 'approved'),
        )
      );

    // گروه‌بندی بر اساس itemId
    const grouped: Record<string, { unitPrice: number; ts: number }[]> = {};
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;

    for (const row of rows) {
      const unitPrice =
        parseFloat((row.finalUnitCost ?? row.estUnitCost) as unknown as string) || 0;
      if (unitPrice <= 0) continue;
      const ts = jalaliToDate(row.makerDate)?.getTime() ?? 0;
      if (!grouped[row.itemId]) grouped[row.itemId] = [];
      grouped[row.itemId]!.push({ unitPrice, ts });
    }

    const changes: Record<string, ItemPriceChange> = {};

    for (const [itemId, entries] of Object.entries(grouped)) {
      entries.sort((a, b) => b.ts - a.ts);
      const lastPrice = entries[0]!.unitPrice;
      const old = entries.filter((e) => e.ts < cutoff);
      const avg3mAgo =
        old.length > 0 ? old.reduce((s, e) => s + e.unitPrice, 0) / old.length : null;
      const change3mPct =
        avg3mAgo != null && avg3mAgo > 0
          ? Math.round(((lastPrice - avg3mAgo) / avg3mAgo) * 1000) / 10
          : null;
      changes[itemId] = { lastPrice: Math.round(lastPrice), change3mPct };
    }

    return NextResponse.json({ changes });
  } catch (e) {
    return handleError(e);
  }
}
