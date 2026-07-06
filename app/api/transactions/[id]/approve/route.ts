import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { rowToTransaction } from '@/lib/db/serializers';
import { applyBalance, applyContactBalance } from '@/lib/db/balanceHelpers';
import { applyMenuSaleDeduction, type MenuSaleLine } from '@/lib/inventory/menuSaleDeduction';
import { audit } from '@/lib/auth/audit';
import { notify, notifyAdmins, getRuleThreshold } from '@/lib/notify';

/**
 * POST /api/transactions/[id]/approve — Atomic با balance update.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAdmin();

    const [current] = await db.select().from(schema.transactions)
      .where(eq(schema.transactions.id, params.id)).limit(1);

    if (!current) throw new ApiError(404, 'تراکنش پیدا نشد', 'TX_NOT_FOUND');
    if (current.status !== 'pending' && current.status !== 'proforma') {
      throw new ApiError(409, 'فقط تراکنش‌های در انتظار یا پیش‌فاکتور قابل تایید هستند', 'INVALID_STATE');
    }

    const now = new Date();

    // اتصال منو↔انبار (Batch 3 / Step 3 — backflushing):
    // اگر تراکنش income حاوی متادیتای فروش منو باشد و قبلاً کسر نشده باشد،
    // با تأیید آن، رسپی هر آیتم منو expand و کسر موجودی + COGS سیستمی اعمال می‌شود.
    const saleMeta = (current.saleMeta ?? null) as { lines?: MenuSaleLine[]; deductedAt?: string } | null;
    const shouldDeduct =
      current.type === 'income' &&
      saleMeta?.lines && Array.isArray(saleMeta.lines) && saleMeta.lines.length > 0 &&
      !saleMeta.deductedAt;

    await db.transaction(async (dbTx) => {
      await dbTx.update(schema.transactions)
        .set({ status: 'approved', approvedBy: session.sub, approvedAt: now, updatedAt: now })
        .where(eq(schema.transactions.id, params.id));

      await applyBalance(dbTx, current);
      if (current.contactId && current.isCredit) {
        await applyContactBalance(dbTx, current);
      }

      if (shouldDeduct) {
        const result = await applyMenuSaleDeduction(
          dbTx, current.branchId, current.date, saleMeta!.lines!, current.amount
        );

        if (result.totalCogs > 0) {
          // ثبت تراکنش هزینه‌ی COGS — یک رکورد دفترداری صرف (هیچ حسابی/صندوقی را اثر نمی‌گذارد)
          const [cogsTx] = await dbTx.insert(schema.transactions).values({
            type: 'expense',
            title: `بهای تمام‌شده‌ی کالای فروخته‌شده — ${current.title}`,
            categoryId: null,
            categoryName: 'بهای تمام‌شده (COGS)',
            amount: result.totalCogs,
            payee: 'انبار',
            branchId: current.branchId,
            branchName: current.branchName,
            method: 'انبار',
            accountId: null, // COGS روی موجودی صندوق اثر نمی‌گذارد — صرفاً ثبت در دفاتر
            vatAmount: 0,
            isCredit: false,
            date: current.date,
            note: `ثبت خودکار از فروش منو — کسر انبار و COGS بر اساس رسپی`,
            status: 'approved',
            createdBy: session.sub,
            approvedBy: session.sub,
            approvedAt: now,
          }).returning();

          // علامت‌گذاری deductedAt روی همان تراکنش فروش — جلوگیری از کسر تکراری (idempotency)
          await dbTx.update(schema.transactions)
            .set({ saleMeta: { ...saleMeta, deductedAt: now.toISOString(), cogsTransactionId: cogsTx?.id ?? null, deductionLines: result.deductionLines } })
            .where(eq(schema.transactions.id, params.id));
        } else {
          await dbTx.update(schema.transactions)
            .set({ saleMeta: { ...saleMeta, deductedAt: now.toISOString(), deductionLines: result.deductionLines } })
            .where(eq(schema.transactions.id, params.id));
        }

        if (result.warnings.length > 0) {
          audit({ action: 'transaction.menuSaleDeduction.warning', userId: session.sub, meta: { txId: params.id, warnings: result.warnings } });
          await notifyAdmins({
            type: 'warning',
            title: 'موجودی ناکافی در فروش منو',
            sub: (result.warnings[0] ?? '').slice(0, 200),
            txId: params.id,
            actionUrl: `/transactions`,
            entityId: params.id,
            ruleKey: 'low_stock',
          }, dbTx, { sms: true });
        }
      }
    });

    const [updated] = await db.select().from(schema.transactions)
      .where(eq(schema.transactions.id, params.id)).limit(1);
    if (!updated) throw new ApiError(500, 'خطا', 'UPDATE_FAILED');

    if (updated.createdBy !== session.sub) {
      await notify({
        type: 'approved',
        title: 'تراکنش تایید شد ✓',
        sub: `${updated.title} — ${updated.branchName}`,
        txId: updated.id,
        actionUrl: `/transactions`,
        entityId: updated.id,
        userId: updated.createdBy,
        ruleKey: 'pending_approval',
      });
    }

    // بررسی تراکنش مبلغ بالا — اعلان + پیامک به ادمین‌ها
    const highValueThreshold = await getRuleThreshold('high_value_tx');
    if (highValueThreshold !== null && updated.amount >= highValueThreshold) {
      await notifyAdmins({
        type: 'critical',
        title: 'تراکنش مبلغ بالا تأیید شد',
        sub: `${updated.title} — ${new Intl.NumberFormat('fa-IR').format(updated.amount)} ت — ${updated.branchName}`,
        txId: updated.id,
        actionUrl: `/transactions`,
        entityId: updated.id,
        ruleKey: 'high_value_tx',
      }, undefined, { sms: true });
    }

    audit({ action: 'transaction.approved', userId: session.sub, meta: { txId: params.id } });
    return NextResponse.json({ transaction: rowToTransaction(updated) });
  } catch (e) {
    return handleError(e);
  }
}
