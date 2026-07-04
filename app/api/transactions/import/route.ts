import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import * as XLSX from 'xlsx';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { applyBalance, applyContactBalance } from '@/lib/db/balanceHelpers';
import { isValidJalaliString } from '@/lib/jalali';
import { audit } from '@/lib/auth/audit';

export const dynamic = 'force-dynamic';

/**
 * POST /api/transactions/import — ورود دسته‌ای تراکنش‌ها از فایل اکسل.
 * تطبیق با نام (اگر نبود → خطای آن ردیف). اتمیک: یا همه وارد می‌شوند یا هیچ.
 *
 * ستون‌های تمپلیت (سرستون فارسی):
 *  نوع | عنوان | مبلغ | تاریخ | شعبه | صندوق | دسته | طرف‌حساب | نسیه | توضیح
 *  income/expense  |  متن  | عدد | 1405/03/16 | نام شعبه | نام صندوق | نام دسته | نام طرف‌حساب | بله/خیر | متن
 */

const TYPE_MAP: Record<string, 'income' | 'expense'> = {
  'income': 'income', 'expense': 'expense',
  'درآمد': 'income', 'هزینه': 'expense', 'دریافت': 'income', 'پرداخت': 'expense',
};

function normNum(v: unknown): number {
  if (typeof v === 'number') return Math.round(v);
  const s = String(v ?? '').replace(/[,٬\s]/g, '').replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
  const n = parseInt(s, 10);
  return isNaN(n) ? 0 : n;
}
function cell(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    if (row[k] != null && String(row[k]).trim()) return String(row[k]).trim();
  }
  return '';
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) throw new ApiError(400, 'فایلی انتخاب نشده است', 'MISSING_FILE');

    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) throw new ApiError(400, 'فایل خالی است', 'EMPTY_FILE');
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet!, { defval: '' });
    if (rows.length === 0) throw new ApiError(400, 'هیچ ردیفی در فایل نیست', 'NO_ROWS');
    if (rows.length > 1000) throw new ApiError(400, 'حداکثر ۱۰۰۰ ردیف در هر بار', 'TOO_MANY');

    // جداول مرجع را یک‌بار بخوان (تطبیق با نام، حساس به فاصله‌ی اضافی نه)
    const [branches, accounts, categories, contacts] = await Promise.all([
      db.select().from(schema.branches),
      db.select().from(schema.accounts),
      db.select().from(schema.categories),
      db.select().from(schema.contacts),
    ]);
    const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
    const findBranch = (n: string) => branches.find(b => norm(b.name) === norm(n));
    const findAccount = (n: string) => accounts.find(a => norm(a.name) === norm(n));
    const findContact = (n: string) => contacts.find(c => norm(c.name) === norm(n));
    const findCategory = (n: string, type: string) =>
      categories.find(c => norm(c.name) === norm(n) && c.type === type);

    // ۱) اعتبارسنجی همه‌ی ردیف‌ها (قبل از هر insert)
    const errors: string[] = [];
    const prepared: Array<Record<string, unknown>> = [];

    rows.forEach((row, i) => {
      const ln = i + 2; // شماره ردیف در اکسل (با سرستون)
      const rawType = cell(row, 'نوع', 'type').toLowerCase();
      const type = TYPE_MAP[rawType];
      if (!type) { errors.push(`ردیف ${ln}: نوع نامعتبر («درآمد» یا «هزینه»)`); return; }

      const title = cell(row, 'عنوان', 'title');
      if (title.length < 2) { errors.push(`ردیف ${ln}: عنوان الزامی است`); return; }

      const amount = normNum(row['مبلغ'] ?? row['amount']);
      if (amount <= 0) { errors.push(`ردیف ${ln}: مبلغ نامعتبر`); return; }

      const date = cell(row, 'تاریخ', 'date');
      if (!isValidJalaliString(date)) { errors.push(`ردیف ${ln}: تاریخ شمسی نامعتبر (مثل 1405/03/16)`); return; }

      const branchName = cell(row, 'شعبه', 'branch');
      const branch = findBranch(branchName);
      if (!branch) { errors.push(`ردیف ${ln}: شعبه‌ی «${branchName}» پیدا نشد`); return; }
      if (session.role === 'BranchUser' && branch.id !== session.branchId) {
        errors.push(`ردیف ${ln}: اجازه‌ی ثبت برای این شعبه را ندارید`); return;
      }

      const accountName = cell(row, 'صندوق', 'account');
      const account = accountName ? findAccount(accountName) : undefined;
      if (accountName && !account) { errors.push(`ردیف ${ln}: صندوق «${accountName}» پیدا نشد`); return; }

      const catName = cell(row, 'دسته', 'category');
      const category = catName ? findCategory(catName, type) : undefined;
      if (catName && !category) { errors.push(`ردیف ${ln}: دسته‌ی «${catName}» برای نوع «${rawType}» پیدا نشد`); return; }

      const contactName = cell(row, 'طرف‌حساب', 'طرف حساب', 'contact');
      const contact = contactName ? findContact(contactName) : undefined;
      if (contactName && !contact) { errors.push(`ردیف ${ln}: طرف‌حساب «${contactName}» پیدا نشد`); return; }

      const isCredit = ['بله', 'نسیه', 'yes', 'true', '1'].includes(cell(row, 'نسیه', 'credit').toLowerCase());

      prepared.push({
        type, title,
        categoryId: category?.id ?? null,
        categoryName: category?.name ?? '',
        amount,
        payee: contact?.name ?? cell(row, 'طرف‌حساب', 'پرداخت‌کننده') ?? '—',
        branchId: branch.id, branchName: branch.name,
        method: account?.name ?? 'نقد',
        accountId: account?.id ?? null,
        contactId: contact?.id ?? null,
        isCredit,
        vatAmount: 0,
        date,
        note: cell(row, 'توضیح', 'note'),
        status: 'approved' as const,
        createdBy: session.sub,
        approvedBy: session.sub,
        approvedAt: new Date(),
      });
    });

    if (errors.length > 0) {
      // هیچ‌چیز وارد نشد — گزارش خطا
      return NextResponse.json({ ok: false, imported: 0, errors }, { status: 422 });
    }

    // ۲) ورود اتمیک همه‌ی ردیف‌ها
    let imported = 0;
    await db.transaction(async (dbTx) => {
      for (const p of prepared) {
        const [tx] = await dbTx.insert(schema.transactions).values(p as any).returning();
        if (!tx) throw new ApiError(500, 'خطا در ثبت یک ردیف', 'INSERT_FAILED');
        if (tx.accountId) await applyBalance(dbTx, tx);
        await applyContactBalance(dbTx, tx);
        imported++;
      }
    });

    void audit({ action: 'transaction.imported', userId: session.sub, meta: { count: imported, branchIds: [...new Set(prepared.map(p => p.branchId as string))] } });
    return NextResponse.json({ ok: true, imported, errors: [] }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
