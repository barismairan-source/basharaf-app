import { NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { rowToTransaction } from '@/lib/db/serializers';
import { applyBalance, applyContactBalance } from '@/lib/db/balanceHelpers';

const createBodySchema = z.object({
  type: z.enum(['income', 'expense', 'transfer']),
  title: z.string().min(2).max(120),
  categoryId: z.string().uuid().optional(),
  amount: z.number().positive().max(999_999_999_999),
  payee: z.string().min(1).max(120),
  branchId: z.string().uuid(),
  method: z.string().min(1),
  receipt: z.string().max(40).optional().default('—'),
  date: z.string().min(1),
  note: z.string().max(500).optional().default(''),
  hasReceipt: z.boolean().optional().default(false),
  accountId: z.string().uuid().optional().nullable(),
  destinationAccountId: z.string().uuid().optional().nullable(),
  contactId: z.string().uuid().optional().nullable(),
  vatAmount: z.number().min(0).max(999_999_999_999).optional().default(0),
  isCredit: z.boolean().optional().default(false),
});

export async function GET() {
  try {
    const session = await requireSession();
    const whereClause = session.role === 'BranchUser' && session.branchId
      ? eq(schema.transactions.branchId, session.branchId)
      : undefined;

    const rows = await db.select().from(schema.transactions)
      .where(whereClause).orderBy(desc(schema.transactions.createdAt));
    return NextResponse.json({ transactions: rows.map(rowToTransaction) });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const input = createBodySchema.parse(await req.json());

    if (session.role === 'BranchUser' && input.branchId !== session.branchId) {
      throw new ApiError(403, 'شما فقط می‌توانید برای شعبه‌ی خود تراکنش ثبت کنید', 'BRANCH_MISMATCH');
    }

    // transfer validation
    if (input.type === 'transfer') {
      if (!input.accountId || !input.destinationAccountId) {
        throw new ApiError(400, 'برای انتقال وجه، صندوق مبدا و مقصد الزامی است', 'TRANSFER_ACCOUNTS_REQUIRED');
      }
      if (input.accountId === input.destinationAccountId) {
        throw new ApiError(400, 'صندوق مبدا و مقصد نمی‌توانند یکسان باشند', 'SAME_ACCOUNT');
      }
    }

    let categoryName = 'انتقال وجه';
    if (input.categoryId && input.type !== 'transfer') {
      const [category] = await db.select().from(schema.categories)
        .where(eq(schema.categories.id, input.categoryId)).limit(1);
      if (!category) throw new ApiError(400, 'دسته انتخاب‌شده پیدا نشد', 'CATEGORY_NOT_FOUND');
      categoryName = category.name;
    }

    const [branch] = await db.select().from(schema.branches)
      .where(eq(schema.branches.id, input.branchId)).limit(1);
    if (!branch) throw new ApiError(400, 'شعبه انتخاب‌شده پیدا نشد', 'BRANCH_NOT_FOUND');

    const isAdmin = session.role === 'SuperAdmin';
    const now = new Date();

    // ── ثبت تراکنش در DB transaction (با balance اگر admin) ──
    const inserted = await db.transaction(async (dbTx) => {
      const [row] = await dbTx.insert(schema.transactions).values({
        type: input.type,
        title: input.title,
        categoryId: input.categoryId || undefined,
        categoryName,
        amount: input.amount,
        payee: input.payee,
        branchId: input.branchId,
        branchName: branch.name,
        method: input.method,
        receipt: input.receipt || '—',
        date: input.date,
        note: input.note ?? '',
        hasReceipt: input.hasReceipt ?? false,
        status: isAdmin ? 'approved' : 'pending',
        createdBy: session.sub,
        approvedBy: isAdmin ? session.sub : null,
        approvedAt: isAdmin ? now : null,
        accountId: input.accountId ?? null,
        destinationAccountId: input.destinationAccountId ?? null,
        contactId: input.contactId ?? null,
        vatAmount: input.vatAmount ?? 0,
        isCredit: input.isCredit ?? false,
      }).returning();

      if (!row) throw new ApiError(500, 'خطا در ثبت تراکنش', 'INSERT_FAILED');

      // اگر admin (approved فوری) و account دارد، balance را اعمال کن
      if (isAdmin && row.accountId) {
        await applyBalance(dbTx, row);
      }
      // اگر نسیه است، balance طرف‌حساب را آپدیت کن
      if (isAdmin && row.contactId && row.isCredit) {
        await applyContactBalance(dbTx, row);
      }

      return row;
    });

    // اعلان برای admin ها اگر pending
    if (inserted.status === 'pending') {
      await createPendingNotifications(inserted.id, inserted.title, branch.name);
    }

    return NextResponse.json({ transaction: rowToTransaction(inserted) }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}

async function createPendingNotifications(txId: string, title: string, branchName: string) {
  const admins = await db.select({ id: schema.users.id }).from(schema.users)
    .where(eq(schema.users.role, 'SuperAdmin'));
  if (admins.length === 0) return;
  await db.insert(schema.notifications).values(
    admins.map(admin => ({
      type: 'pending' as const,
      title: 'تراکنش در انتظار بررسی',
      sub: `${title} — ${branchName}`,
      time: 'به‌تازگی',
      read: false,
      txId,
      userId: admin.id,
    }))
  );
}
