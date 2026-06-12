import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { applyPhysicalLine } from '@/lib/db/inventoryHelpers';
import { audit } from '@/lib/auth/audit';
import { getTodayJalali } from '@/lib/jalali';
import { createPendingNotifications } from '@/lib/inventory/pendingNotifications';

type VoucherKind = 'in' | 'out' | 'waste' | 'sale' | 'produce' | 'stocktake';

// نگاشت نوع معکوس — اصلاحی هر برگه دقیقاً اثر آن را خنثی می‌کند
const REVERSED_KIND: Record<'in' | 'out' | 'waste' | 'sale' | 'produce', VoucherKind> = {
  in: 'out',
  out: 'in',
  waste: 'in',
  sale: 'in',
  produce: 'waste',
};

/**
 * POST /api/inventory/vouchers/[id]/reversal — برگه‌ی اصلاحی برای یک برگه‌ی approved.
 * فقط SuperAdmin. برگه‌ی جدید pending با kind معکوس و parentVoucherId = برگه‌ی اصلی
 * ساخته می‌شود — اثر آن فقط بعد از تأیید جداگانه روی موجودی/حسابداری اعمال می‌شود.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAdmin();

    const [original] = await db.select().from(schema.invVouchers)
      .where(eq(schema.invVouchers.id, params.id)).limit(1);
    if (!original) throw new ApiError(404, 'برگه پیدا نشد', 'VOUCHER_NOT_FOUND');
    if (original.status !== 'approved') {
      throw new ApiError(409, 'فقط برگه‌های تأییدشده قابل اصلاح هستند', 'INVALID_STATE');
    }

    const [existingReversal] = await db.select({ id: schema.invVouchers.id }).from(schema.invVouchers)
      .where(eq(schema.invVouchers.parentVoucherId, params.id)).limit(1);
    if (existingReversal) {
      throw new ApiError(409, 'برگه اصلاحی قبلاً ساخته شده', 'REVERSAL_EXISTS');
    }

    const kind = original.kind as VoucherKind;
    if (kind === 'stocktake') {
      throw new ApiError(400, 'برگه‌ی انبارگردانی قابل اصلاح نیست', 'NOT_REVERSIBLE');
    }
    const reversedKind = REVERSED_KIND[kind];

    // خطوط برگه‌ی جدید: برگه‌ی produce خطی در inv_voucher_lines ندارد (مستقیماً approved
    // ساخته می‌شود)، پس itemId/مقدار آن از دفتر حرکت موجودی (inv_stock_tx) بازیابی می‌شود.
    let newLines: Array<{ itemId: string; qtyBase: number; estUnitCost: number }>;
    if (kind === 'produce') {
      const [stockTx] = await db.select().from(schema.invStockTx)
        .where(and(eq(schema.invStockTx.voucherId, original.id), eq(schema.invStockTx.kind, 'produce')))
        .limit(1);
      if (!stockTx) throw new ApiError(400, 'رکورد حرکت موجودی این برگه پیدا نشد — قابل اصلاح نیست', 'NO_STOCK_TX');
      const qtyBase = parseFloat(stockTx.deltaBase);
      const estUnitCost = qtyBase > 0 ? stockTx.value / qtyBase : 0;
      newLines = [{ itemId: stockTx.itemId, qtyBase, estUnitCost }];
    } else {
      const lines = await db.select().from(schema.invVoucherLines)
        .where(eq(schema.invVoucherLines.voucherId, original.id));
      newLines = lines.map((l) => ({
        itemId: l.itemId,
        qtyBase: parseFloat(l.qtyBase),
        estUnitCost: l.finalUnitCost != null ? parseFloat(l.finalUnitCost) : parseFloat(l.estUnitCost),
      }));
    }

    const estTotal = Math.round(newLines.reduce((s, l) => s + l.estUnitCost * l.qtyBase, 0));
    const no = `RV-${original.no}`;

    const reversal = await db.transaction(async (dbTx) => {
      const [v] = await dbTx.insert(schema.invVouchers).values({
        no,
        kind: reversedKind,
        status: 'pending',
        branchId: original.branchId,
        estTotal,
        note: `اصلاحی برگه #${original.no}`,
        createdBy: session.sub,
        makerDate: getTodayJalali(),
        parentVoucherId: original.id,
      }).returning();
      if (!v) throw new ApiError(500, 'خطا در ساخت برگه اصلاحی', 'INSERT_FAILED');

      for (const l of newLines) {
        await dbTx.insert(schema.invVoucherLines).values({
          voucherId: v.id,
          itemId: l.itemId,
          qtyBase: String(l.qtyBase),
          estUnitCost: String(l.estUnitCost),
        });
        await applyPhysicalLine(dbTx, l.itemId, l.qtyBase, reversedKind, 1);
      }

      return v;
    });

    audit({ action: 'reversal_created', userId: session.sub, meta: { originalId: original.id, reversalId: reversal.id } });

    const branchId = reversal.branchId;
    if (branchId) {
      await createPendingNotifications(reversal.id, `برگه ${no}`, branchId);
    }

    return NextResponse.json({ reversalId: reversal.id }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
