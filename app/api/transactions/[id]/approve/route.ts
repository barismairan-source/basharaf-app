import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { rowToTransaction } from '@/lib/db/serializers';
import { applyBalance, applyContactBalance } from '@/lib/db/balanceHelpers';
import { audit } from '@/lib/auth/audit';

/**
 * POST /api/transactions/[id]/approve — Atomic با balance update.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAdmin();

    const [current] = await db.select().from(schema.transactions)
      .where(eq(schema.transactions.id, params.id)).limit(1);

    if (!current) throw new ApiError(404, 'تراکنش پیدا نشد', 'TX_NOT_FOUND');
    if (current.status !== 'pending') {
      throw new ApiError(409, 'فقط تراکنش‌های در انتظار قابل تایید هستند', 'INVALID_STATE');
    }

    const now = new Date();

    await db.transaction(async (dbTx) => {
      await dbTx.update(schema.transactions)
        .set({ status: 'approved', approvedBy: session.sub, approvedAt: now, updatedAt: now })
        .where(eq(schema.transactions.id, params.id));

      await applyBalance(dbTx, current);
      if (current.contactId && current.isCredit) {
        await applyContactBalance(dbTx, current);
      }
    });

    const [updated] = await db.select().from(schema.transactions)
      .where(eq(schema.transactions.id, params.id)).limit(1);
    if (!updated) throw new ApiError(500, 'خطا', 'UPDATE_FAILED');

    if (updated.createdBy !== session.sub) {
      await db.insert(schema.notifications).values({
        type: 'approved',
        title: 'تراکنش تایید شد ✓',
        sub: `${updated.title} — ${updated.branchName}`,
        time: 'به‌تازگی',
        read: false,
        txId: updated.id,
        userId: updated.createdBy,
      });
    }

    audit({ action: 'transaction.approved', userId: session.sub, meta: { txId: params.id } });
    return NextResponse.json({ transaction: rowToTransaction(updated) });
  } catch (e) {
    return handleError(e);
  }
}
