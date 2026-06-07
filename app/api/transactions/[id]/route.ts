import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { rowToTransaction } from '@/lib/db/serializers';
import { applyBalance, reverseBalance, applyContactBalance, reverseContactBalance } from '@/lib/db/balanceHelpers';
import { audit } from '@/lib/auth/audit';

const patchBodySchema = z.object({
  title: z.string().min(2).max(120).optional(),
  categoryId: z.string().uuid().optional(),
  amount: z.number().positive().max(999_999_999_999).optional(),
  payee: z.string().min(1).max(120).optional(),
  method: z.string().min(1).optional(),
  receipt: z.string().max(40).optional(),
  date: z.string().min(1).optional(),
  note: z.string().max(500).optional(),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    const tx = await fetchAndAuthorize(params.id, session);
    return NextResponse.json({ transaction: rowToTransaction(tx) });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    const tx = await fetchAndAuthorize(params.id, session);

    const isAdmin = session.role === 'SuperAdmin';
    const isOwnPending =
      session.role === 'BranchUser' &&
      tx.status === 'pending' &&
      tx.createdBy === session.sub;
    if (!isAdmin && !isOwnPending) {
      throw new ApiError(403, 'دسترسی به ویرایش این تراکنش ندارید', 'FORBIDDEN');
    }

    const input = patchBodySchema.parse(await req.json());

    const updates: Partial<typeof schema.transactions.$inferInsert> = {
      ...input,
      updatedAt: new Date(),
    };

    if (input.categoryId) {
      const [cat] = await db.select().from(schema.categories)
        .where(eq(schema.categories.id, input.categoryId)).limit(1);
      if (!cat) throw new ApiError(400, 'دسته انتخاب‌شده پیدا نشد', 'CATEGORY_NOT_FOUND');
      updates.categoryName = cat.name;
    }

    // ── اگر تراکنش approved است و amount تغییر می‌کند ──
    // باید balance قدیمی معکوس و جدید اعمال شود
    const amountChanged = input.amount !== undefined && Number(input.amount) !== Number(tx.amount);

    if (tx.status === 'approved' && amountChanged && tx.accountId) {
      await db.transaction(async (dbTx) => {
        // ۱. معکوس کردن اثر قدیمی
        await reverseBalance(dbTx, tx);
        await reverseContactBalance(dbTx, tx);
        // ۲. آپدیت تراکنش
        await dbTx.update(schema.transactions).set(updates)
          .where(eq(schema.transactions.id, params.id));
        // ۳. اعمال اثر جدید با amount جدید
        await applyBalance(dbTx, { ...tx, amount: input.amount! });
        await applyContactBalance(dbTx, { ...tx, amount: input.amount! });
      });
      audit({ action: 'transaction.deleted', userId: session.sub, meta: { txId: params.id, note: 'amount edited, balance adjusted' } });
    } else {
      // تراکنش pending یا amount تغییر نکرده — فقط آپدیت
      await db.update(schema.transactions).set(updates)
        .where(eq(schema.transactions.id, params.id));
    }

    const [updated] = await db.select().from(schema.transactions)
      .where(eq(schema.transactions.id, params.id)).limit(1);
    if (!updated) throw new ApiError(404, 'تراکنش پیدا نشد', 'TX_NOT_FOUND');

    return NextResponse.json({ transaction: rowToTransaction(updated) });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    if (session.role !== 'SuperAdmin') {
      throw new ApiError(403, 'فقط مدیر کل می‌تواند حذف کند', 'FORBIDDEN');
    }

    const [tx] = await db.select().from(schema.transactions)
      .where(eq(schema.transactions.id, params.id)).limit(1);
    if (!tx) throw new ApiError(404, 'تراکنش پیدا نشد', 'TX_NOT_FOUND');

    // ── اگر تراکنش approved بود، balance را معکوس کن قبل از حذف ──
    await db.transaction(async (dbTx) => {
      if (tx.status === 'approved' && tx.accountId) {
        await reverseBalance(dbTx, tx);
      }
      if (tx.status === 'approved') {
        // نسیه: مانده‌ی طرف‌حساب را هم برگردان (تابع خودش گارد contactId/isCredit دارد)
        await reverseContactBalance(dbTx, tx);
      }
      await dbTx.delete(schema.transactions)
        .where(eq(schema.transactions.id, params.id));
    });

    audit({ action: 'transaction.deleted', userId: session.sub, meta: { txId: params.id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}

async function fetchAndAuthorize(
  id: string,
  session: { sub: string; role: string; branchId: string | null }
) {
  const [tx] = await db.select().from(schema.transactions)
    .where(eq(schema.transactions.id, id)).limit(1);
  if (!tx) throw new ApiError(404, 'تراکنش پیدا نشد', 'TX_NOT_FOUND');
  if (session.role === 'BranchUser' && tx.branchId !== session.branchId) {
    throw new ApiError(404, 'تراکنش پیدا نشد', 'TX_NOT_FOUND');
  }
  return tx;
}
