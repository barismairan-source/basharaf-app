import { eq, sql, inArray } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { applyBalance } from '@/lib/db/balanceHelpers';

/**
 * ════════════════════════════════════════════════════════════════
 *  پل GL — اتصال ماژول حقوق به حسابداری هسته
 * ════════════════════════════════════════════════════════════════
 *
 * هسته single-entry است (فقط جدول transactions، نه دفتر کل دوطرفه).
 * پس «posting حقوق» یعنی:
 *
 *   ۱. ساخت یک سند متوازن (journal_voucher) با خطوط بدهکار/بستانکار
 *      برای حسابرسی و شفافیت کامل.
 *   ۲. ساخت یک «تراکنش هزینه» در هسته که موجودی صندوق را کم می‌کند.
 *
 * ⚠️ تصمیم حسابداری:
 *   مبلغ تراکنش هسته = «خالص پرداختی» (net pay) — مبلغی که واقعاً از
 *   حساب خارج می‌شود. بیمه و مالیات کسرشده، بدهی به دولت‌اند که جداگانه
 *   پرداخت می‌شوند؛ آن‌ها در سند (voucher) ثبت می‌شوند ولی روی موجودی
 *   صندوق در لحظه‌ی پرداخت حقوق اثر نمی‌گذارند.
 *
 *   اگر می‌خواهید کل هزینه (ناخالص + سهم کارفرما) به‌عنوان هزینه ثبت شود،
 *   مقدار POST_MODE را به 'gross' تغییر دهید.
 */

type PostMode = 'net' | 'gross';
const POST_MODE: PostMode = 'net';

export interface VoucherLine {
  code: string;
  labelFa: string;
  debit: number;   // بدهکار (تومان)
  credit: number;  // بستانکار (تومان)
}

export interface PostResult {
  ok: boolean;
  voucherId: string;
  basharafTransactionId: string | null;
  alreadyPosted: boolean;
  totalDebit: number;
  totalCredit: number;
}

/**
 * ساخت خطوط سند متوازن از مجموع فیش‌های یک اجرای حقوق.
 * (بدهکار = بستانکار، تضمین‌شده)
 */
export function buildVoucherLines(totals: {
  grossEarnings: number;
  insuranceEmployee: number;
  insuranceEmployer: number;
  incomeTax: number;
  netPay: number;
}): VoucherLine[] {
  const lines: VoucherLine[] = [];

  // بدهکار: هزینه حقوق (ناخالص) + سهم کارفرمای بیمه
  lines.push({ code: 'salary_expense', labelFa: 'هزینه حقوق و دستمزد', debit: totals.grossEarnings, credit: 0 });
  if (totals.insuranceEmployer > 0)
    lines.push({ code: 'employer_insurance_expense', labelFa: 'هزینه بیمه سهم کارفرما', debit: totals.insuranceEmployer, credit: 0 });

  // بستانکار: آنچه باید پرداخت/تسویه شود
  if (totals.netPay > 0)
    lines.push({ code: 'net_payable', labelFa: 'خالص پرداختی پرسنل', debit: 0, credit: totals.netPay });
  const insurancePayable = totals.insuranceEmployee + totals.insuranceEmployer;
  if (insurancePayable > 0)
    lines.push({ code: 'insurance_payable', labelFa: 'بدهی بیمه (سازمان تأمین اجتماعی)', debit: 0, credit: insurancePayable });
  if (totals.incomeTax > 0)
    lines.push({ code: 'tax_payable', labelFa: 'بدهی مالیات حقوق', debit: 0, credit: totals.incomeTax });

  return lines;
}

/**
 * post یک اجرای حقوق به هسته.
 * - اتمیک (همه‌چیز در یک DB transaction)
 * - idempotent (idempotencyKey مانع post دوباره می‌شود)
 *
 * @param runId      شناسه‌ی payroll_run (باید status='approved' باشد)
 * @param accountId  صندوق/حسابی که حقوق از آن پرداخت می‌شود
 * @param userId     کاربری که post را انجام می‌دهد (createdBy تراکنش)
 * @param jalaliDate تاریخ شمسی برای تراکنش هسته (رشته)
 */
export async function postPayrollRunToBasharaf(
  runId: string,
  accountId: string,
  userId: string,
  jalaliDate: string,
): Promise<PostResult> {
  return db.transaction(async (dbTx) => {
    // ۱. اجرا را بخوان و وضعیت را چک کن
    const [run] = await dbTx.select().from(schema.payrollRuns).where(eq(schema.payrollRuns.id, runId)).limit(1);
    if (!run) throw new Error('اجرای حقوق پیدا نشد');
    if (run.status !== 'approved') throw new Error('فقط اجرای تأییدشده قابل ثبت است');

    const idempotencyKey = `payroll_run:${runId}`;

    // ۲. idempotency — اگر قبلاً post شده، همان را برگردان
    const [existing] = await dbTx.select().from(schema.journalVouchers)
      .where(eq(schema.journalVouchers.idempotencyKey, idempotencyKey)).limit(1);
    if (existing && existing.status === 'posted') {
      return {
        ok: true, voucherId: existing.id,
        basharafTransactionId: existing.basharafVoucherId,
        alreadyPosted: true,
        totalDebit: Number(existing.totalDebit), totalCredit: Number(existing.totalCredit),
      };
    }

    // ۳. مجموع فیش‌های این اجرا
    const slips = await dbTx.select().from(schema.payslips).where(eq(schema.payslips.payrollRunId, runId));
    if (slips.length === 0) throw new Error('این اجرا هیچ فیشی ندارد — اول محاسبه کنید');

    const totals = slips.reduce(
      (a, s) => ({
        grossEarnings: a.grossEarnings + Number(s.grossEarnings),
        insuranceEmployee: a.insuranceEmployee + Number(s.insuranceEmployee),
        insuranceEmployer: a.insuranceEmployer + Number(s.insuranceEmployer),
        incomeTax: a.incomeTax + Number(s.incomeTax),
        netPay: a.netPay + Number(s.netPay),
      }),
      { grossEarnings: 0, insuranceEmployee: 0, insuranceEmployer: 0, incomeTax: 0, netPay: 0 },
    );

    // ۴. ساخت خطوط سند متوازن
    const lines = buildVoucherLines(totals);
    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
    if (totalDebit !== totalCredit) {
      throw new Error(`سند نامتوازن: بدهکار ${totalDebit} ≠ بستانکار ${totalCredit}`);
    }

    // ۵. مبلغی که روی موجودی صندوق اثر می‌گذارد
    const cashAmount = POST_MODE === 'net' ? totals.netPay : totals.grossEarnings;

    // ۶. ساخت تراکنش هزینه در هسته (status=approved، چون اجرا قبلاً تأیید شده)
    const [coreTx] = await dbTx.insert(schema.transactions).values({
      type: 'expense',
      title: `حقوق و دستمزد ${run.periodYearMonth}`,
      categoryId: null,
      categoryName: 'حقوق پرسنل',
      amount: cashAmount,
      payee: 'پرسنل',
      branchId: run.branchId!,
      branchName: run.branchName ?? '',
      method: 'حقوق',
      accountId,
      vatAmount: 0,
      isCredit: false,
      date: jalaliDate,
      note: `ثبت خودکار از ماژول حقوق — اجرای ${run.periodYearMonth} (${POST_MODE === 'net' ? 'خالص' : 'ناخالص'})`,
      status: 'approved',
      createdBy: userId,
      approvedBy: userId,
      approvedAt: new Date(),
    }).returning();
    if (!coreTx) throw new Error('ساخت تراکنش هسته ناموفق بود');

    // ۷. اعمال اثر روی موجودی صندوق (expense → کم می‌شود)
    await applyBalance(dbTx, coreTx);

    // ۸. ثبت/به‌روزرسانی سند
    let voucherId: string;
    if (existing) {
      await dbTx.update(schema.journalVouchers).set({
        lines, totalDebit, totalCredit, status: 'posted',
        basharafVoucherId: coreTx.id, postedAt: new Date(),
      }).where(eq(schema.journalVouchers.id, existing.id));
      voucherId = existing.id;
    } else {
      const [v] = await dbTx.insert(schema.journalVouchers).values({
        payrollRunId: runId,
        period: run.periodYearMonth,
        branchId: run.branchId,
        lines, totalDebit, totalCredit,
        idempotencyKey,
        basharafVoucherId: coreTx.id,
        status: 'posted',
        postedAt: new Date(),
      }).returning();
      if (!v) throw new Error('ساخت سند ناموفق بود');
      voucherId = v.id;
    }

    // ۹. علامت‌گذاری اجرا به‌عنوان posted
    await dbTx.update(schema.payrollRuns).set({
      status: 'posted',
      postedToBasharafAt: new Date(),
      journalVoucherId: voucherId,
    }).where(eq(schema.payrollRuns.id, runId));

    return {
      ok: true, voucherId, basharafTransactionId: coreTx.id,
      alreadyPosted: false, totalDebit, totalCredit,
    };
  });
}

/**
 * معکوس کردن post (در صورت اشتباه).
 * تراکنش هسته را reverse و سند را reversed می‌کند.
 */
export async function reversePayrollPost(runId: string): Promise<{ ok: boolean }> {
  return db.transaction(async (dbTx) => {
    const [voucher] = await dbTx.select().from(schema.journalVouchers)
      .where(eq(schema.journalVouchers.idempotencyKey, `payroll_run:${runId}`)).limit(1);
    if (!voucher || voucher.status !== 'posted') {
      const err = new Error('این دوره سند حسابداری ندارد — نیاز به بازنشانی اجباری دارد');
      (err as NodeJS.ErrnoException).code = 'NO_JOURNAL_VOUCHER';
      throw err;
    }

    // reverse تراکنش هسته
    if (voucher.basharafVoucherId) {
      const [coreTx] = await dbTx.select().from(schema.transactions)
        .where(eq(schema.transactions.id, voucher.basharafVoucherId)).limit(1);
      if (coreTx && coreTx.status === 'approved' && coreTx.accountId) {
        // expense reverse → موجودی برمی‌گردد
        await dbTx.update(schema.accounts)
          .set({ balance: sql`balance + ${Number(coreTx.amount)}`, updatedAt: new Date() })
          .where(eq(schema.accounts.id, coreTx.accountId));
        await dbTx.delete(schema.transactions).where(eq(schema.transactions.id, coreTx.id));
      }
    }

    await dbTx.update(schema.journalVouchers).set({ status: 'reversed' }).where(eq(schema.journalVouchers.id, voucher.id));
    await dbTx.update(schema.payrollRuns).set({
      status: 'approved', postedToBasharafAt: null, journalVoucherId: null,
    }).where(eq(schema.payrollRuns.id, runId));

    return { ok: true };
  });
}

// جلوگیری از حذف import بلااستفاده (inArray برای توسعه‌ی آینده)
void inArray;
