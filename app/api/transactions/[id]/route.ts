import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { rowToTransaction } from '@/lib/db/serializers';
import {
  reverseBalance, reverseContactBalance,
  reverseSaleDeduction, voidCogsTransaction,
} from '@/lib/db/balanceHelpers';
import { audit } from '@/lib/auth/audit';

/**
 * سیاست «ویرایش پس از تأیید» (Edit-After-Approval Policy) — طبق
 * project-docs/financial-integrity-spec.md §۳:
 *
 *   غیرمالی → همیشه آزاد (هیچ اثری روی balance/contact/انبار ندارند)
 *   مالی    → پس از approve کاملاً غیرقابل‌ویرایش (immutable) — تنها مسیر رسمی
 *             تغییر این مقادیر، حذف تراکنش (Reverse اتمیک کامل) و ثبت یک
 *             تراکنش جدید است؛ این گزینه (immutability) کمترین ریسک را دارد
 *             چون مانع از partial-reversal/balance-drift می‌شود.
 *
 * این لیست باید با هر فیلد جدیدی که روی balance/contact/انبار اثر می‌گذارد
 * هم‌زمان به‌روزرسانی شود — در غیر این صورت، آن فیلد می‌تواند بی‌صدا balance
 * را روی تراکنش‌های approved منحرف کند.
 */
const FINANCIAL_FIELD_KEYS = [
  'amount', 'accountId', 'destinationAccountId', 'type', 'isCredit', 'contactId', 'vatAmount',
] as const;

const FINANCIAL_IMMUTABILITY_MESSAGE =
  'جزئیات مالی این تراکنش پس از تأیید قابل ویرایش نیستند. ' +
  'برای اصلاح، تراکنش را حذف کنید (که به‌صورت کامل و اتمیک معکوس می‌شود) و یک تراکنش جدید ثبت کنید. ' +
  '(Financial details cannot be modified after approval. Please delete the transaction to reverse it, and create a new one.)';

const patchBodySchema = z.object({
  // ── غیرمالی — همیشه آزادانه قابل‌ویرایش (بدون اثر بر balance/انبار) ──
  title: z.string().min(2).max(120).optional(),
  categoryId: z.string().uuid().optional(),
  payee: z.string().min(1).max(120).optional(),
  method: z.string().min(1).optional(),
  receipt: z.string().max(40).optional(),
  date: z.string().min(1).optional(),
  note: z.string().max(500).optional(),

  // ── مالی — فقط روی تراکنش‌های pending قابل‌قبول؛ روی approved مسدود می‌شوند (پایین‌تر) ──
  amount: z.number().positive().max(999_999_999_999).optional(),
  accountId: z.string().uuid().nullable().optional(),
  destinationAccountId: z.string().uuid().nullable().optional(),
  type: z.enum(['income', 'expense', 'transfer']).optional(),
  isCredit: z.boolean().optional(),
  contactId: z.string().uuid().nullable().optional(),
  vatAmount: z.number().min(0).max(999_999_999_999).optional(),
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

    // ── قفل غیرقابل‌عبور: فیلدهای مالی روی تراکنش‌های approved تغییرناپذیرند ──
    // طبق سند صحت مالی (Edit-After-Approval Policy، گزینه‌ی Immutability — کمترین ریسک):
    // اگر هر یک از فیلدهای مالی در payload حضور داشته باشد و تراکنش approved باشد،
    // قبل از هرگونه نوشتن در دیتابیس، درخواست را با 422 و پیام صریح مسدود می‌کنیم.
    // این چک عمداً روی «حضور کلید در payload» است نه «تغییر مقدار» — چون حتی ارسال
    // همان مقدار قبلی هم نباید مسیر نوشتن را باز کند (سطح حفاظتی سخت‌گیرانه‌تر).
    const touchedFinancialFields = FINANCIAL_FIELD_KEYS.filter((key) => input[key] !== undefined);

    if (tx.status === 'approved' && touchedFinancialFields.length > 0) {
      throw new ApiError(422, FINANCIAL_IMMUTABILITY_MESSAGE, 'FINANCIAL_FIELDS_IMMUTABLE_AFTER_APPROVAL', {
        fields: touchedFinancialFields,
      });
    }

    // از این نقطه به بعد: یا تراکنش pending است (ویرایش مالی هم آزاد)، یا approved
    // است و فقط فیلدهای غیرمالی در payload حضور دارند — در هر دو حالت یک UPDATE ساده
    // کافی است؛ هیچ چرخه‌ی reverse/apply لازم نیست چون balance/contact/انبار اثری نمی‌خورند.
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

    await db.update(schema.transactions).set(updates)
      .where(eq(schema.transactions.id, params.id));

    // ردپای حسابرسی برای تغییراتی که می‌توانند روی گزارش‌های گذشته اثر بگذارند
    // (دسته‌بندی/تاریخ) — حتی اگر روی balance اثر نداشته باشند (سند صحت مالی §۳.۱)
    if (tx.status === 'approved' && (input.categoryId || input.date)) {
      audit({
        action: 'transaction.nonFinancialEdit',
        userId: session.sub,
        meta: { txId: params.id, fields: [input.categoryId ? 'categoryId' : null, input.date ? 'date' : null].filter(Boolean) },
      });
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
    // ── Rollback کامل و اتمیک یک تراکنش approved (می‌بندد Bug #1 از سند صحت مالی) ──
    // ترتیب معکوسِ دقیقِ اعمال در زمان approve، تا هیچ ردپای مالی/انباری یتیم نماند:
    //   ۱. reverseBalance         — خنثی‌سازی اثر روی موجودی صندوق (account)
    //   ۲. reverseContactBalance  — خنثی‌سازی اثر روی مانده‌ی طرف‌حساب (نسیه)
    //   ۳. reverseSaleDeduction   — بازگرداندن مقدار کسرشده‌ی انبار (backflushing فروش منو)
    //   ۴. voidCogsTransaction    — ابطال سند هزینه‌ی COGس خودکارساخته‌شده
    //   ۵. حذف خودِ رکورد تراکنش
    // همه درون یک db.transaction — یا همه باهم انجام می‌شود یا هیچ‌کدام (atomic).
    const saleMeta = (tx.saleMeta ?? null) as
      | { deductedAt?: string | null; deductionLines?: import('@/lib/inventory/menuSaleDeduction').SaleDeductionLine[] | null; cogsTransactionId?: string | null }
      | null;

    await db.transaction(async (dbTx) => {
      if (tx.status === 'approved') {
        if (tx.accountId) {
          await reverseBalance(dbTx, tx);
        }
        // نسیه: مانده‌ی طرف‌حساب را هم برگردان (تابع خودش گارد contactId/isCredit دارد)
        await reverseContactBalance(dbTx, tx);

        // فروش منو با کسر انبار قبلاً اعمال‌شده (idempotency guard: فقط اگر deductedAt ست شده)
        if (saleMeta?.deductedAt) {
          await reverseSaleDeduction(dbTx, saleMeta, tx.date);
          await voidCogsTransaction(dbTx, saleMeta);
        }
      }
      await dbTx.delete(schema.transactions)
        .where(eq(schema.transactions.id, params.id));
    });

    audit({
      action: 'transaction.deleted',
      userId: session.sub,
      meta: {
        txId: params.id,
        wasApproved: tx.status === 'approved',
        reversedSaleDeduction: !!saleMeta?.deductedAt,
        voidedCogsTransactionId: saleMeta?.cogsTransactionId ?? null,
      },
    });

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
