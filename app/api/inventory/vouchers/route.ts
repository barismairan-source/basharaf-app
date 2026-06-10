import { NextResponse } from 'next/server';
import { eq, desc, and } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { canDo } from '@/lib/auth/permissions';
import { ApiError, handleError } from '@/lib/api-error';
import { rowToInvVoucher } from '@/lib/db/inventory.serializers';
import { applyPhysicalLine } from '@/lib/db/inventoryHelpers';

/**
 * /api/inventory/vouchers
 *   GET  — لیست برگه‌ها (?status=pending|approved|rejected) با branch scope
 *   POST — ثبت برگه توسط انباردار (maker): status=pending، فقط لایه‌ی فیزیکی.
 *
 * این دقیقاً مثل POST تراکنش است: BranchUser فقط شعبه خودش، اثر قطعی فقط
 * بعد از approve (که در route جداگانه است). اینجا فقط qtyPhysical آپدیت می‌شود.
 */

// مبالغ/مقادیر باید finite و در محدوده‌ی امن باشند — نه Infinity/NaN و نه چنان بزرگ
// که در numeric(24,6) ستون‌های بهای واحد (یا در ضرب qty × cost) سرریز ایجاد کند.
// سقف ۱۰۰ میلیارد تومان برای «بهای هر واحد پایه» با فاصله‌ی زیاد از مقادیر واقعی است
// و همزمان مقدار خراب نمونه (۶۵.۵ میلیارد) را هم به‌صورت خوانا رد می‌کند.
const MONEY_MAX = 100_000_000_000; // ۱۰۰ میلیارد تومان

const lineSchema = z.object({
  itemId: z.string().uuid(),
  qtyBase: z.number().finite().positive().max(1_000_000_000, 'مقدار خیلی بزرگ است'),
  estUnitCost: z.number().finite('بهای واحد نامعتبر است').min(0).max(MONEY_MAX, 'بهای واحد بیش از حد مجاز است — لطفاً بررسی کنید').default(0),
  // تاریخ انقضای محموله (جلالی، اختیاری) — برای ردیابی/هشدار انقضا (زمینه‌ساز FIFO آینده)
  expiryDate: z.string().max(20).optional().nullable(),
});

const createVoucherSchema = z.object({
  kind: z.enum(['in', 'out', 'waste', 'sale', 'produce', 'stocktake']),
  branchId: z.string().uuid(),
  note: z.string().max(500).optional().default(''),
  date: z.string().min(1), // Jalali
  lines: z.array(lineSchema).min(1),
  saleMeta: z.any().optional().nullable(),
});

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as 'pending' | 'approved' | 'rejected' | null;

    const clauses = [];
    if (session.role === 'BranchUser' && session.branchId) {
      clauses.push(eq(schema.invVouchers.branchId, session.branchId));
    }
    if (status) clauses.push(eq(schema.invVouchers.status, status));
    const where = clauses.length ? and(...clauses) : undefined;

    const rows = await db.select().from(schema.invVouchers)
      .where(where).orderBy(desc(schema.invVouchers.createdAt));

    // تفکیک وظایف: انباردار / کاربران بدون مجوز مالی، مبالغ برگه را نمی‌بینند
    const maskCosts = !canDo(session, 'inventory.viewCosts');

    // خطوط هر برگه
    const result = [];
    for (const v of rows) {
      const lines = await db.select().from(schema.invVoucherLines)
        .where(eq(schema.invVoucherLines.voucherId, v.id));
      result.push(rowToInvVoucher(v, lines, maskCosts));
    }
    return NextResponse.json({ vouchers: result });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const input = createVoucherSchema.parse(await req.json());

    if (session.role === 'BranchUser' && input.branchId !== session.branchId) {
      throw new ApiError(403, 'شما فقط می‌توانید برای شعبه‌ی خود برگه ثبت کنید', 'BRANCH_MISMATCH');
    }

    // انباردار: حق ثبت رسید خرید و وارد کردن قیمت ندارد (دفاع سمت سرور)
    const isWarehouse = session.role === 'Warehouse';
    if (isWarehouse && input.kind === 'in') {
      throw new ApiError(403, 'انباردار اجازه‌ی ثبت رسید خرید ندارد', 'FORBIDDEN');
    }
    if (isWarehouse) {
      input.lines = input.lines.map((l) => ({ ...l, estUnitCost: 0 }));
    }

    // برآورد جمع
    const estTotal = Math.round(
      input.lines.reduce((s, l) => s + l.estUnitCost * l.qtyBase, 0)
    );

    // شماره برگه: R-{jalaliCompact}-{seq شعبه}
    const seq = await db.select({ id: schema.invVouchers.id }).from(schema.invVouchers)
      .where(eq(schema.invVouchers.branchId, input.branchId));
    const no = `R-${input.date.replace(/[^0-9]/g, '').slice(0, 6)}-${String(seq.length + 1).padStart(3, '0')}`;

    const inserted = await db.transaction(async (dbTx) => {
      const [v] = await dbTx.insert(schema.invVouchers).values({
        no,
        kind: input.kind,
        status: 'pending',
        branchId: input.branchId,
        estTotal,
        note: input.note ?? '',
        saleMeta: input.saleMeta ?? null,
        createdBy: session.sub,
        makerDate: input.date,
      }).returning();
      if (!v) throw new ApiError(500, 'خطا در ثبت برگه', 'INSERT_FAILED');

      for (const l of input.lines) {
        await dbTx.insert(schema.invVoucherLines).values({
          voucherId: v.id,
          itemId: l.itemId,
          qtyBase: String(l.qtyBase),
          estUnitCost: String(l.estUnitCost),
          ...(l.expiryDate ? { expiryDate: l.expiryDate } : {}),
        });
        // فقط لایه‌ی فیزیکی (قطعی بعد از تأیید). انبارگردانی استثناست:
        // qtyBase آن «موجودی شمرده‌شده» است نه حرکت، پس فیزیکی را تغییر نمی‌دهیم.
        if (input.kind !== 'stocktake') {
          await applyPhysicalLine(dbTx, l.itemId, l.qtyBase, input.kind, 1);
        }
      }

      const lines = await dbTx.select().from(schema.invVoucherLines)
        .where(eq(schema.invVoucherLines.voucherId, v.id));
      return { v, lines };
    });

    // اعلان برای ادمین‌ها (مثل تراکنش pending)
    await createPendingNotifications(inserted.v.id, `برگه ${no}`, input.branchId);

    return NextResponse.json(
      { voucher: rowToInvVoucher(inserted.v, inserted.lines, !canDo(session, 'inventory.viewCosts')) },
      { status: 201 }
    );
  } catch (e) {
    return handleError(e);
  }
}

async function createPendingNotifications(voucherId: string, title: string, branchId: string) {
  const admins = await db.select({ id: schema.users.id }).from(schema.users)
    .where(eq(schema.users.role, 'SuperAdmin'));
  if (admins.length === 0) return;
  await db.insert(schema.notifications).values(
    admins.map(admin => ({
      type: 'pending' as const,
      title: 'برگه انبار در انتظار تأیید',
      sub: title,
      time: 'به‌تازگی',
      read: false,
      txId: null, // برگه‌ی انبار است، نه تراکنش — ستون txId به transactions اشاره دارد و نباید id برگه را بگیرد
      userId: admin.id,
    }))
  );
}
