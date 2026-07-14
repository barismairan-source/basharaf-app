import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import * as XLSX from 'xlsx';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { receiveConfirmed } from '@/lib/db/inventoryHelpers';
import { applyBalance } from '@/lib/db/balanceHelpers';

export const dynamic = 'force-dynamic';

/**
 * POST /api/inventory/items/import — ورود دسته‌ای اقلام انبار + موجودی اولیه از اکسل.
 * تطبیق شعبه با نام. کد قلم در هر شعبه یکتا (تکراری = خطا). اتمیک.
 *
 * ستون‌ها: کد | نام | دسته | نوع | واحد | مقدار هر واحد | بازده | موجودی اولیه | بهای واحد | حداقل موجودی | شعبه
 */

const UNIT_MAP: Record<string, string> = {
  'kg': 'kg', 'g': 'g', 'l': 'L', 'ml': 'ml', 'pcs': 'pcs', 'can': 'can', 'pack': 'pack',
  'کیلوگرم': 'kg', 'کیلو': 'kg', 'گرم': 'g', 'لیتر': 'L', 'میلی‌لیتر': 'ml', 'میلی لیتر': 'ml',
  'عدد': 'pcs', 'قوطی': 'can', 'بسته': 'pack',
};
const KIND_MAP: Record<string, 'raw' | 'prep'> = {
  'raw': 'raw', 'prep': 'prep',
  'اولیه': 'raw', 'ماده اولیه': 'raw', 'خام': 'raw', 'نیمه‌آماده': 'prep', 'نیمه آماده': 'prep',
};

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

export async function POST(req: Request) {
  try {
    const session = await requireAdmin();

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
    const existing = await db.select({ code: schema.invItems.code, branchId: schema.invItems.branchId })
      .from(schema.invItems);
    const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
    const findBranch = (n: string) => branches.find(b => norm(b.name) === norm(n));

    const errors: string[] = [];
    const prepared: Array<{ row: typeof schema.invItems.$inferInsert; initialQty: number; unitCost: number }> = [];
    const seenCodes = new Set<string>(); // code|branch داخل همین فایل

    rows.forEach((row, i) => {
      const ln = i + 2;
      const code = cell(row, 'کد', 'code');
      if (!code) { errors.push(`ردیف ${ln}: کد الزامی است`); return; }
      const name = cell(row, 'نام', 'name');
      if (name.length < 2) { errors.push(`ردیف ${ln}: نام الزامی است`); return; }

      const branchName = cell(row, 'شعبه', 'branch');
      const branch = findBranch(branchName);
      if (!branch) { errors.push(`ردیف ${ln}: شعبه‌ی «${branchName}» پیدا نشد`); return; }

      const key = `${code}|${branch.id}`;
      if (seenCodes.has(key)) { errors.push(`ردیف ${ln}: کد «${code}» در فایل تکراری است`); return; }
      if (existing.some(e => e.code === code && e.branchId === branch.id)) {
        errors.push(`ردیف ${ln}: کد «${code}» از قبل در این شعبه ثبت شده`); return;
      }
      seenCodes.add(key);

      const unit = (UNIT_MAP[cell(row, 'واحد', 'unit').toLowerCase()] ?? 'kg') as 'kg' | 'g' | 'L' | 'ml' | 'pcs' | 'can' | 'pack';
      const kind = KIND_MAP[cell(row, 'نوع', 'kind').toLowerCase()] ?? 'raw';
      const basePerUnit = num(row['مقدار هر واحد'] ?? row['basePerUnit']) || 1000;
      const yieldPct = num(row['بازده'] ?? row['yieldPct']) || 100;
      const initialQty = num(row['موجودی اولیه'] ?? row['qty']);
      const unitCost = num(row['بهای واحد'] ?? row['cost']); // تومان به‌ازای هر واحد (نه پایه)
      const minBase = num(row['حداقل موجودی'] ?? row['minBase']);

      // بهای هر واحد پایه = بهای واحد ÷ مقدار هر واحد به پایه
      const avgCostPerBase = basePerUnit > 0 ? unitCost / basePerUnit : 0;

      prepared.push({
        row: {
          code, name,
          category: cell(row, 'دسته', 'category') || 'سایر',
          kind, branchId: branch.id, unit,
          basePerUnit: String(basePerUnit),
          yieldPct: String(yieldPct),
          // مقدار اولیه از طریق pipeline اتمیک اعمال می‌شود — اینجا صفر شروع می‌کنیم
          qtyPhysical: '0',
          qtyBase: '0',
          avgCostPerBase: '0',
          minBase: String(minBase),
          isActive: true,
        },
        initialQty,
        unitCost: avgCostPerBase,
      });
    });

    if (errors.length > 0) {
      return NextResponse.json({ ok: false, imported: 0, errors }, { status: 422 });
    }

    const todayJalali = new Date().toISOString().slice(0, 10);
    let imported = 0;

    // مجموع ارزش موجودی اولیه به تفکیک شعبه — برای ثبت یک تراکنش حسابداری تجمیعی
    const branchTotals = new Map<string, { branchId: string; branchName: string; total: number }>();

    await db.transaction(async (dbTx) => {
      for (const p of prepared) {
        const [row] = await dbTx.insert(schema.invItems).values(p.row).returning();
        if (!row) continue;
        imported++;

        if (p.initialQty > 0) {
          const totalCost = Math.round(p.initialQty * p.unitCost);
          // ۱) ورود قطعی از طریق pipeline اتمیک — qtyBase/avgCostPerBase را به‌درستی محاسبه و به‌روزرسانی می‌کند
          await receiveConfirmed(dbTx, row.id, p.initialQty, totalCost);
          // ۲) ثبت در دفتر حرکات انبار — تا ردپای حسابرسی موجود باشد (نه بدون منشأ)
          await dbTx.insert(schema.invStockTx).values({
            itemId: row.id,
            kind: 'in',
            deltaBase: String(p.initialQty),
            value: totalCost,
            note: 'موجودی اولیه — ورود دسته‌ای از اکسل',
            jalaliDate: todayJalali,
          });

          if (totalCost > 0) {
            const key = row.branchId!;
            const t = branchTotals.get(key) ?? { branchId: row.branchId!, branchName: '', total: 0 };
            t.total += totalCost;
            branchTotals.set(key, t);
          }
        }
      }

      // ۳) ثبت تراکنش حسابداری تجمیعی به‌ازای هر شعبه — تا ارزش موجودی اولیه در هسته‌ی مالی هم منعکس شود
      for (const t of branchTotals.values()) {
        const [b] = await dbTx.select().from(schema.branches).where(eq(schema.branches.id, t.branchId)).limit(1);
        let account: { id: string } | undefined;
        const [a1] = await dbTx.select().from(schema.accounts)
          .where(and(eq(schema.accounts.branchId, t.branchId), eq(schema.accounts.isActive, true))).limit(1);
        account = a1;
        if (!account) {
          const [a2] = await dbTx.select().from(schema.accounts).where(eq(schema.accounts.isActive, true)).limit(1);
          account = a2;
        }
        const accountId = account?.id ?? null;

        const [coreTx] = await dbTx.insert(schema.transactions).values({
          type: 'expense',
          title: 'ثبت موجودی اولیه انبار — ورود دسته‌ای از اکسل',
          categoryId: null,
          categoryName: 'موجودی اولیه انبار',
          amount: t.total,
          payee: 'انبار',
          branchId: t.branchId,
          branchName: b?.name ?? '',
          method: 'انبار',
          accountId,
          vatAmount: 0,
          isCredit: false,
          date: todayJalali,
          note: 'ثبت خودکار از ورود دسته‌ای اقلام انبار (ارزش موجودی اولیه)',
          status: 'approved',
          createdBy: session.sub,
          approvedBy: session.sub,
          approvedAt: new Date(),
        }).returning();

        if (coreTx && accountId) await applyBalance(dbTx, coreTx);
      }
    });

    return NextResponse.json({ ok: true, imported, errors: [] }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
