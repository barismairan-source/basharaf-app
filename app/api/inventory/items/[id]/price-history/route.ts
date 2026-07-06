// GET /api/inventory/items/[id]/price-history
import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';
import { jalaliToDate } from '@/lib/jalali';

export type PriceRecord = {
  date: string;
  unitPrice: number;
  qty: number;
  source: string;
  voucherId: string;
};

export type PriceHistorySummary = {
  firstPrice: number;
  lastPrice: number;
  avgPrice: number;
  changePct: number | null;
  change3mPct: number | null;
};

export type PriceHistoryResponse = {
  history: PriceRecord[];
  summary: PriceHistorySummary | null;
};

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireSession();
    const itemId = params.id;

    const rows = await db
      .select({
        voucherId: schema.invVouchers.id,
        no: schema.invVouchers.no,
        makerDate: schema.invVouchers.makerDate,
        qtyBase: schema.invVoucherLines.qtyBase,
        finalUnitCost: schema.invVoucherLines.finalUnitCost,
        estUnitCost: schema.invVoucherLines.estUnitCost,
      })
      .from(schema.invVoucherLines)
      .innerJoin(schema.invVouchers, eq(schema.invVoucherLines.voucherId, schema.invVouchers.id))
      .where(
        and(
          eq(schema.invVoucherLines.itemId, itemId),
          eq(schema.invVouchers.kind, 'in'),
          eq(schema.invVouchers.status, 'approved'),
        )
      );

    if (rows.length === 0) {
      return NextResponse.json<PriceHistoryResponse>({ history: [], summary: null });
    }

    type WithTs = PriceRecord & { ts: number };
    const records: WithTs[] = rows
      .map((r): WithTs | null => {
        const unitPrice =
          parseFloat((r.finalUnitCost ?? r.estUnitCost) as unknown as string) || 0;
        if (unitPrice <= 0) return null;
        const qty = parseFloat(r.qtyBase as unknown as string) || 0;
        const ts = jalaliToDate(r.makerDate)?.getTime() ?? 0;
        return { date: r.makerDate, unitPrice, qty, source: r.no, voucherId: r.voucherId, ts };
      })
      .filter((r): r is WithTs => r !== null);

    if (records.length === 0) {
      return NextResponse.json<PriceHistoryResponse>({ history: [], summary: null });
    }

    records.sort((a, b) => b.ts - a.ts);

    const lastPrice = records[0]!.unitPrice;
    const firstPrice = records[records.length - 1]!.unitPrice;
    const avgPrice = records.reduce((s, r) => s + r.unitPrice, 0) / records.length;

    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const old = records.filter((r) => r.ts < cutoff);
    const avg3mAgo =
      old.length > 0 ? old.reduce((s, r) => s + r.unitPrice, 0) / old.length : null;

    const changePct =
      records.length >= 2 && firstPrice > 0
        ? Math.round(((lastPrice - firstPrice) / firstPrice) * 1000) / 10
        : null;

    const change3mPct =
      avg3mAgo != null && avg3mAgo > 0
        ? Math.round(((lastPrice - avg3mAgo) / avg3mAgo) * 1000) / 10
        : null;

    const summary: PriceHistorySummary = {
      firstPrice: Math.round(firstPrice),
      lastPrice: Math.round(lastPrice),
      avgPrice: Math.round(avgPrice),
      changePct,
      change3mPct,
    };

    const history: PriceRecord[] = records.map(({ ts: _ts, ...r }) => r);
    return NextResponse.json<PriceHistoryResponse>({ history, summary });
  } catch (e) {
    return handleError(e);
  }
}
