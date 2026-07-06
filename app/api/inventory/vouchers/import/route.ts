import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import * as XLSX from 'xlsx';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { applyPhysicalLine } from '@/lib/db/inventoryHelpers';
import { isValidJalaliString } from '@/lib/jalali';

export const dynamic = 'force-dynamic';

/**
 * POST /api/inventory/vouchers/import — ورود دسته‌ای رسید خرید از اکسل.
 * هر ردیف = یک قلم. ردیف‌هایی با «شماره فاکتور» یکسان در یک برگه جمع می‌شوند.
 * تطبیق قلم با کد (در شعبه) و شعبه با نام. اتمیک. برگه‌ها pending ساخته می‌شوند.
 *
 * ستون‌ها: شماره فاکتور | تاریخ | شعبه | کد قلم | مقدار | بهای واحد | توضیح
 */

function num(v: unknown): number {
  if (typeof v === 'number') return v;
  const s = String(v ?? '').replace(/[,٬\s]/g, '').replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}
function cell(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) if (row[k] != null && String(row[k]).trim()) return String(row[k]).trim();
  return '';
}

interface PreparedLine { itemId: string; qtyBase: number; estUnitCost: number; }
interface PreparedVoucher {
  groupKey: string; branchId: string; branchName: string; date: string;
  note: string; lines: PreparedLine[];
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    if (session.role === 'Warehouse') {
      throw new ApiError(403, 'انباردار اجازه‌ی ثبت رسید خرید را ندارد', 'FORBIDDEN');
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) throw new ApiError(400, 'فایلی انتخاب نشده است', 'MISSING_FILE');

    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) throw new ApiError(400, 'فایل خالی است', 'EMPTY_FILE');
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName]!, { defval: '' });
    if (rows.length === 0) throw new ApiError(400, 'هیچ ردیفی نیست', 'NO_ROWS');
    if (rows.length > 2000) throw new ApiError(400, 'حداکثر ۲۰۰۰ ردیف', 'TOO_MANY');

    const branches = await db.select().from(schema.branches);
    const items = await db.select({ id: schema.invItems.id, code: schema.invItems.code, branchId: schema.invItems.branchId })
      .from(schema.invItems);
    const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
    const findBranch = (n: string) => branches.find(b => norm(b.name) === norm(n));
    const findItem = (code: string, branchId: string) => items.find(it => it.code === code && it.branchId === branchId);

    // ۱) اعتبارسنجی و گروه‌بندی ردیف‌ها بر اساس «شماره فاکتور»
    const errors: string[] = [];
    const groups = new Map<string, PreparedVoucher>();

    rows.forEach((row, i) => {
      const ln = i + 2;
      const invoiceNo = cell(row, 'شماره فاکتور', 'فاکتور', 'invoice') || `_row${i}`;
      const date = cell(row, 'تاریخ', 'date');
      if (!isValidJalaliString(date)) { errors.push(`ردیف ${ln}: تاریخ شمسی نامعتبر`); return; }

      const branchName = cell(row, 'شعبه', 'branch');
      const branch = findBranch(branchName);
      if (!branch) { errors.push(`ردیف ${ln}: شعبه‌ی «${branchName}» پیدا نشد`); return; }
      if (session.role === 'BranchUser' && branch.id !== session.branchId) {
        errors.push(`ردیف ${ln}: اجازه‌ی این شعبه را ندارید`); return;
      }

      const code = cell(row, 'کد قلم', 'کد', 'code');
      if (!code) { errors.push(`ردیف ${ln}: کد قلم الزامی است`); return; }
      const item = findItem(code, branch.id);
      if (!item) { errors.push(`ردیف ${ln}: قلم با کد «${code}» در این شعبه پیدا نشد`); return; }

      const qty = num(row['مقدار'] ?? row['qty']);
      if (qty <= 0) { errors.push(`ردیف ${ln}: مقدار نامعتبر`); return; }
      const unitCost = num(row['بهای واحد'] ?? row['cost']);
      if (unitCost < 0) { errors.push(`ردیف ${ln}: بهای واحد نامعتبر`); return; }

      // کلید گروه: فاکتور + شعبه (یک فاکتور برای یک شعبه)
      const key = `${invoiceNo}|${branch.id}`;
      let g = groups.get(key);
      if (!g) {
        g = { groupKey: key, branchId: branch.id, branchName: branch.name, date, note: cell(row, 'توضیح', 'note'), lines: [] };
        groups.set(key, g);
      }
      g.lines.push({ itemId: item.id, qtyBase: qty, estUnitCost: unitCost });
    });

    if (errors.length > 0) {
      return NextResponse.json({ ok: false, imported: 0, vouchers: 0, errors }, { status: 422 });
    }

    const voucherList = [...groups.values()];

    // ۲) ساخت اتمیک همه‌ی برگه‌ها (pending)
    let vouchers = 0, lineCount = 0;
    await db.transaction(async (dbTx) => {
      // شماره‌ی توالی per شعبه را یک‌بار بخوان و در حافظه افزایش بده
      const seqByBranch = new Map<string, number>();
      for (const v of voucherList) {
        if (!seqByBranch.has(v.branchId)) {
          const existing = await dbTx.select({ id: schema.invVouchers.id }).from(schema.invVouchers)
            .where(eq(schema.invVouchers.branchId, v.branchId));
          seqByBranch.set(v.branchId, existing.length);
        }
        const nextSeq = (seqByBranch.get(v.branchId) ?? 0) + 1;
        seqByBranch.set(v.branchId, nextSeq);
        const no = `R-${v.date.replace(/[^0-9]/g, '').slice(0, 6)}-${String(nextSeq).padStart(3, '0')}`;
        const estTotal = Math.round(v.lines.reduce((s, l) => s + l.estUnitCost * l.qtyBase, 0));

        const [voucher] = await dbTx.insert(schema.invVouchers).values({
          no, kind: 'in', status: 'pending', branchId: v.branchId,
          estTotal, note: v.note || 'ورود دسته‌ای رسید خرید',
          saleMeta: null, createdBy: session.sub, makerDate: v.date,
        }).returning();
        if (!voucher) throw new ApiError(500, 'خطا در ساخت برگه', 'INSERT_FAILED');

        for (const l of v.lines) {
          await dbTx.insert(schema.invVoucherLines).values({
            voucherId: voucher.id, itemId: l.itemId,
            qtyBase: String(l.qtyBase), estUnitCost: String(l.estUnitCost),
          });
          await applyPhysicalLine(dbTx, l.itemId, l.qtyBase, 'in', 1);
          lineCount++;
        }
        vouchers++;
      }
    });

    // اعلان برای ادمین‌ها
    const { notifyAdmins } = await import('@/lib/notify');
    await notifyAdmins({
      type: 'pending',
      title: 'رسیدهای خرید دسته‌ای در انتظار تأیید',
      sub: `${vouchers} برگه`,
      txId: null,
      actionUrl: '/inventory/cartable',
      ruleKey: 'voucher_pending',
    }, undefined, { sms: true });

    return NextResponse.json({ ok: true, vouchers, imported: lineCount, errors: [] }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
