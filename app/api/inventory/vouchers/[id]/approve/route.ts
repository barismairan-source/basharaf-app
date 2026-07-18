import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { rowToInvVoucher } from '@/lib/db/inventory.serializers';
import { approveVoucherTx } from '@/lib/db/inventoryHelpers';
import { wasteSpikeRule } from '@/lib/anomaly/rules/wasteSpikeRule';
import { priceJumpRule } from '@/lib/anomaly/rules/priceJumpRule';
import { saveFindings } from '@/lib/anomaly/engine';
import { postPurchaseToAccounting, postSaleToAccounting, postWasteToAccounting, postStocktakeToAccounting } from '@/lib/inventory/postToAccounting';
import { computeAutoRecost } from '@/lib/inventory/costing';
import { audit } from '@/lib/auth/audit';
import { canDo } from '@/lib/auth/permissions';

/**
 * POST /api/inventory/vouchers/[id]/approve — Atomic با موجودی قطعی + میانگین موزون.
 *
 * دقیقاً مثل approve تراکنش: requireAdmin، چک حالت pending، db.transaction،
 * و استفاده از helper (approveVoucherTx که اثر فیزیکی را reverse و قطعی را apply می‌کند).
 *
 * body: { finalUnitCosts: { [itemId]: number } } — قیمت نهایی هر واحد پایه (برای رسید ورود).
 */

// مثل lineSchema در ثبت برگه: عدد باید finite و در سقف معقول باشد تا داده‌ی
// خراب/غول‌آسا حین تأیید باعث numeric field overflow در محاسبات میانگین موزون نشود.
const MONEY_MAX = 100_000_000_000; // ۱۰۰ میلیارد تومان — سقف معقول برای بهای هر واحد پایه

const bodySchema = z.object({
  finalUnitCosts: z
    .record(z.string(), z.number().finite('بهای نهایی نامعتبر است').min(0).max(MONEY_MAX, 'بهای نهایی بیش از حد مجاز است'))
    .optional()
    .default({}),
  accountId: z.string().uuid('شناسه‌ی صندوق معتبر نیست').optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    if (!canDo(session, 'inventory.approve')) {
      throw new ApiError(403, 'شما اجازه‌ی تأیید برگه‌ی انبار را ندارید', 'FORBIDDEN');
    }
    const { finalUnitCosts, accountId: bodyAccountId } = bodySchema.parse(await req.json().catch(() => ({})));

    const [current] = await db.select().from(schema.invVouchers)
      .where(eq(schema.invVouchers.id, params.id)).limit(1);
    if (!current) throw new ApiError(404, 'برگه پیدا نشد', 'VOUCHER_NOT_FOUND');
    if (current.status !== 'pending') {
      throw new ApiError(409, 'فقط برگه‌های در انتظار قابل تأیید هستند', 'INVALID_STATE');
    }

    // Maker-Checker: تأییدکننده نباید همان سازنده‌ی برگه باشد — جز SuperAdmin که
    // می‌تواند self-approve کند، اما این رویداد در audit_log ثبت می‌شود (selfApprove).
    if (current.createdBy === session.sub && session.role !== 'SuperAdmin') {
      throw new ApiError(403, 'تأییدکننده نمی‌تواند همان سازنده‌ی برگه باشد', 'SELF_APPROVE_FORBIDDEN');
    }
    const selfApprove = current.createdBy === session.sub;

    const lines = await db.select().from(schema.invVoucherLines)
      .where(eq(schema.invVoucherLines.voucherId, params.id));
    if (lines.length === 0) throw new ApiError(400, 'برگه بدون خط است', 'EMPTY_VOUCHER');

    const now = new Date();
    const kind = current.kind as 'in' | 'out' | 'waste' | 'sale' | 'produce' | 'stocktake';

    // resolve حساب برای رسید خرید — قبل از transaction
    let purchaseAccountId: string | null = null;
    if (kind === 'in') {
      if (bodyAccountId) {
        const [acc] = await db.select({ id: schema.accounts.id, isActive: schema.accounts.isActive })
          .from(schema.accounts).where(eq(schema.accounts.id, bodyAccountId)).limit(1);
        if (!acc || !acc.isActive) {
          throw new ApiError(422, 'صندوق انتخاب‌شده وجود ندارد یا غیرفعال است', 'INVALID_ACCOUNT');
        }
        purchaseAccountId = acc.id;
      } else {
        // fallback: اولین حساب فعال شعبه
        let acc: { id: string } | undefined;
        if (current.branchId) {
          const [a] = await db.select({ id: schema.accounts.id })
            .from(schema.accounts)
            .where(and(eq(schema.accounts.branchId, current.branchId), eq(schema.accounts.isActive, true)))
            .limit(1);
          acc = a;
        }
        if (!acc) {
          const [a] = await db.select({ id: schema.accounts.id })
            .from(schema.accounts).where(eq(schema.accounts.isActive, true)).limit(1);
          acc = a;
        }
        if (!acc) {
          throw new ApiError(422, 'برای تأیید رسید خرید باید یک صندوق فعال در سیستم وجود داشته باشد', 'NO_ACTIVE_ACCOUNT');
        }
        purchaseAccountId = acc.id;
      }
    }

    const finalTotal = await db.transaction(async (dbTx) => {
      // قفل برگه داخل transaction — جلوگیری از تأیید همزمان (SELECT FOR UPDATE)
      const [lockedVoucher] = await dbTx.select({ status: schema.invVouchers.status })
        .from(schema.invVouchers)
        .where(eq(schema.invVouchers.id, params.id))
        .for('update');
      if (!lockedVoucher || lockedVoucher.status !== 'pending') {
        throw new ApiError(409, 'فقط برگه‌های در انتظار قابل تأیید هستند', 'INVALID_STATE');
      }

      // خطوط را با قیمت نهایی (در صورت وجود) آماده کن
      const prepared = lines.map((l) => ({
        itemId: l.itemId,
        qtyBase: parseFloat(l.qtyBase),
        estUnitCost: parseFloat(l.estUnitCost),
        finalUnitCost: finalUnitCosts[l.itemId] ?? null,
      }));

      // پیش‌خوانی موجودی برای انبارگردانی — اختلاف پس از تأیید را می‌سنجیم
      // (approveVoucherTx موجودی را به‌روز می‌کند، پس باید قبل از آن بخوانیم)
      const preStocktakeQtys: Record<string, { q: number; a: number }> = {};
      if (kind === 'stocktake') {
        for (const l of lines) {
          const [it] = await dbTx.select({ q: schema.invItems.qtyBase, a: schema.invItems.avgCostPerBase })
            .from(schema.invItems).where(eq(schema.invItems.id, l.itemId)).limit(1);
          preStocktakeQtys[l.itemId] = { q: parseFloat(it?.q ?? '0'), a: parseFloat(it?.a ?? '0') };
        }
      }

      // اعمال اتمیک: reverse فیزیکی، سپس apply قطعی + میانگین موزون
      const total = await approveVoucherTx(dbTx, kind, prepared, { voucherId: current.id });

      // انباشت مغایرت پولی انبارگردانی (WAC قبل از تأیید × اختلاف مقدار)
      let stocktakeVarianceCost = 0;

      // ثبت قیمت نهایی خطوط + لاگ حرکت موجودی
      for (const l of lines) {
        if (kind === 'stocktake') {
          // لاگ invStockTx برای انبارگردانی — دقیقاً مثل مسیر مستقیم API/stocktake
          const counted = parseFloat(l.qtyBase);
          const pre = preStocktakeQtys[l.itemId] ?? { q: 0, a: 0 };
          const diff = counted - pre.q;
          stocktakeVarianceCost += diff * pre.a;
          if (Math.abs(diff) > 1e-6) {
            await dbTx.insert(schema.invStockTx).values({
              itemId: l.itemId,
              voucherId: current.id,
              kind: 'stocktake',
              deltaBase: String(diff),
              value: Math.round(diff * pre.a),
              note: `برگه ${current.no}`,
              jalaliDate: current.makerDate,
            });
          }
          continue;
        }
        const fu = finalUnitCosts[l.itemId];
        if (fu != null) {
          await dbTx.update(schema.invVoucherLines)
            .set({ finalUnitCost: String(fu) })
            .where(eq(schema.invVoucherLines.id, l.id));
        }
        // لاگ حرکت موجودی
        const signedQty =
          kind === 'in' || kind === 'produce' ? parseFloat(l.qtyBase) : -parseFloat(l.qtyBase);
        await dbTx.insert(schema.invStockTx).values({
          itemId: l.itemId,
          voucherId: current.id,
          kind,
          deltaBase: String(signedQty),
          value: Math.round((fu ?? parseFloat(l.estUnitCost)) * parseFloat(l.qtyBase)),
          note: `برگه ${current.no}`,
          ...(l.expiryDate ? { expiryDate: l.expiryDate } : {}),
          jalaliDate: current.makerDate,
        });
      }

      // وضعیت برگه → approved (با WHERE guard — defense-in-depth)
      await dbTx.update(schema.invVouchers)
        .set({ status: 'approved', finalTotal: total, approvedBy: session.sub, approvedAt: now, updatedAt: now })
        .where(and(eq(schema.invVouchers.id, params.id), eq(schema.invVouchers.status, 'pending')));

      // اتصال به حسابداری: برگه‌ی خرید → سند هزینه‌ی واقعی + کسر از صندوق
      if (kind === 'in') {
        await postPurchaseToAccounting(
          dbTx,
          { id: current.id, no: current.no, branchId: current.branchId, makerDate: current.makerDate, linkedTransactionId: current.linkedTransactionId },
          total,
          session.sub,
          purchaseAccountId,
        );

        // نوسان قیمت / WAC: قیمت ماده‌ی خام تغییر کرد → بهای نیمه‌آماده‌های متأثر را
        // خودکار بازمحاسبه کن (همان زنجیره‌ی resolvePrepCostChain، بدون تکرار منطق)
        const branchFilter = current.branchId ? eq(schema.invItems.branchId, current.branchId) : undefined;
        const allItems = await dbTx.select().from(schema.invItems).where(branchFilter);
        const recostInput = allItems.map((it: any) => ({
          id: it.id, name: it.name, unit: it.unit, kind: it.kind as 'raw' | 'prep',
          avgCostPerBase: parseFloat(it.avgCostPerBase),
          yieldPct: parseFloat(it.yieldPct) || 100,
          batchYieldBase: parseFloat(it.batchYieldBase) || 0,
          prepRecipe: (it.prepRecipe as any) ?? null,
        }));
        const { changed } = computeAutoRecost({ items: recostInput });
        for (const c of changed) {
          await dbTx.update(schema.invItems)
            .set({ avgCostPerBase: String(c.avgCostPerBase), updatedAt: now })
            .where(eq(schema.invItems.id, c.itemId));
        }
        if (changed.length > 0) {
          audit({ action: 'inv.autoRecost.afterPurchase', userId: session.sub, meta: { voucherId: current.id, changedCount: changed.length } });
        }
      }

      // ضایعات → سند هزینه‌ی ضایعات (دفترداری، بدون اثر بر صندوق — مثل COGS فروش منو)
      if (kind === 'waste') {
        await postWasteToAccounting(
          dbTx,
          { id: current.id, no: current.no, branchId: current.branchId, makerDate: current.makerDate, linkedTransactionId: current.linkedTransactionId },
          total,
          session.sub,
        );
      }

      // انبارگردانی → سند P&L مغایرت (بدون اثر روی صندوق)
      if (kind === 'stocktake') {
        await postStocktakeToAccounting(
          dbTx,
          { id: current.id, no: current.no, branchId: current.branchId, makerDate: current.makerDate, linkedTransactionId: current.linkedTransactionId },
          stocktakeVarianceCost,
          session.sub,
        );
      }

      // اگر فروش بود، گزارش فروش روزانه ثبت کن
      if (kind === 'sale' && current.saleMeta) {
        const meta = current.saleMeta as { lines?: any[]; revenue?: number };
        await dbTx.insert(schema.invDailySales).values({
          voucherId: current.id,
          branchId: current.branchId,
          jalaliDate: current.makerDate,
          lines: meta.lines ?? [],
          totalCogs: total,
          totalRevenue: Math.round(meta.revenue ?? 0),
        });
        // درآمد فروش → سند درآمد در حسابداری + افزایش موجودی صندوق
        await postSaleToAccounting(
          dbTx,
          { id: current.id, no: current.no, branchId: current.branchId, makerDate: current.makerDate, linkedTransactionId: current.linkedTransactionId },
          Math.round(meta.revenue ?? 0),
          session.sub,
        );
      }

      return total;
    });

    const [updated] = await db.select().from(schema.invVouchers)
      .where(eq(schema.invVouchers.id, params.id)).limit(1);
    const updatedLines = await db.select().from(schema.invVoucherLines)
      .where(eq(schema.invVoucherLines.voucherId, params.id));

    // اعلان به ثبت‌کننده
    if (updated && updated.createdBy && updated.createdBy !== session.sub) {
      const { notify } = await import('@/lib/notify');
      await notify({
        type: 'approved',
        title: 'برگه انبار تأیید شد ✓',
        sub: `برگه ${updated.no} — مبلغ ${finalTotal.toLocaleString('fa-IR')}`,
        txId: updated.linkedTransactionId ?? null,
        actionUrl: `/inventory/cartable`,
        entityId: updated.id,
        userId: updated.createdBy,
        ruleKey: 'voucher_approved',
      });
    }

    // کارآگاه: قانون‌های event-driven بعد از commit (fire-and-forget)
    if (kind === 'waste' && current.branchId) {
      void wasteSpikeRule({
        voucherId: params.id,
        branchId: current.branchId,
        finalTotal,
        makerDate: current.makerDate,
      }).then((f) => saveFindings(f)).catch(() => {});
    }
    if (kind === 'in' && current.branchId && updatedLines.length > 0) {
      const pjLines = updatedLines.map((l) => ({
        itemId: l.itemId,
        finalUnitCost: parseFloat(l.finalUnitCost ?? l.estUnitCost),
      }));
      void priceJumpRule({
        voucherId: params.id,
        branchId: current.branchId,
        lines: pjLines,
        makerDate: current.makerDate,
      }).then((f) => saveFindings(f)).catch(() => {});
    }

    audit({ action: 'inv.voucher.approved', userId: session.sub, meta: { voucherId: params.id, finalTotal, selfApprove } });
    return NextResponse.json({ voucher: rowToInvVoucher(updated!, updatedLines) });
  } catch (e) {
    return handleError(e);
  }
}
