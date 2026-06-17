import { NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { rowToPurchaseOrder } from '@/lib/db/operations.serializers';
import { getTodayJalali } from '@/lib/jalali';
import { audit } from '@/lib/auth/audit';

/**
 * /api/purchase-orders
 *   GET  — لیست سفارش‌های خرید (branch scope) با اقلام هر سفارش
 *   POST — ثبت سفارش خرید جدید با وضعیت draft (بدون اثر مالی/انباری)
 */

const MONEY_MAX = 100_000_000_000; // ۱۰۰ میلیارد تومان

const itemSchema = z.object({
  inventoryItemId: z.string().uuid().optional().nullable(),
  description: z.string().min(1).max(200),
  qty: z.number().finite().positive().max(1_000_000_000, 'مقدار خیلی بزرگ است'),
  unitCost: z.number().finite('بهای واحد نامعتبر است').min(0).max(MONEY_MAX, 'بهای واحد بیش از حد مجاز است').optional().default(0),
});

const createPoSchema = z.object({
  branchId: z.string().uuid(),
  supplierId: z.string().uuid().optional().nullable(),
  expectedDate: z.string().max(20).optional().nullable(),
  note: z.string().max(500).optional().default(''),
  items: z.array(itemSchema).min(1, 'حداقل یک قلم لازم است'),
});

export async function GET() {
  try {
    const session = await requireSession();
    const where = session.role !== 'SuperAdmin' && session.branchId
      ? eq(schema.purchaseOrders.branchId, session.branchId)
      : undefined;

    const rows = await db.select().from(schema.purchaseOrders)
      .where(where).orderBy(desc(schema.purchaseOrders.createdAt));

    const result = [];
    for (const po of rows) {
      const items = await db.select().from(schema.purchaseOrderItems)
        .where(eq(schema.purchaseOrderItems.orderId, po.id));
      result.push(rowToPurchaseOrder(po, items));
    }
    return NextResponse.json({ orders: result });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const input = createPoSchema.parse(await req.json());

    if (session.role === 'BranchUser' && input.branchId !== session.branchId) {
      throw new ApiError(403, 'شما فقط می‌توانید برای شعبه‌ی خود سفارش ثبت کنید', 'BRANCH_MISMATCH');
    }
    if (session.role === 'Warehouse') {
      throw new ApiError(403, 'انباردار اجازه‌ی ثبت سفارش خرید ندارد', 'FORBIDDEN');
    }

    if (input.supplierId) {
      const [supplier] = await db.select({ id: schema.contacts.id, type: schema.contacts.type })
        .from(schema.contacts).where(eq(schema.contacts.id, input.supplierId)).limit(1);
      if (!supplier) throw new ApiError(404, 'تأمین‌کننده پیدا نشد', 'SUPPLIER_NOT_FOUND');
      if (supplier.type !== 'supplier') {
        throw new ApiError(422, 'طرف‌حساب انتخاب‌شده تأمین‌کننده نیست', 'INVALID_SUPPLIER');
      }
    }

    for (const it of input.items) {
      if (it.inventoryItemId) {
        const [inv] = await db.select({ id: schema.invItems.id })
          .from(schema.invItems).where(eq(schema.invItems.id, it.inventoryItemId)).limit(1);
        if (!inv) throw new ApiError(404, 'قلم انبار پیدا نشد', 'ITEM_NOT_FOUND');
      }
    }

    const itemsWithTotal = input.items.map((it) => ({
      ...it,
      totalCost: Math.round(it.qty * (it.unitCost ?? 0)),
    }));
    const estTotal = itemsWithTotal.reduce((s, it) => s + it.totalCost, 0);

    // شماره سفارش: PO-{jalaliCompact}-{seq شعبه}
    const seq = await db.select({ id: schema.purchaseOrders.id }).from(schema.purchaseOrders)
      .where(eq(schema.purchaseOrders.branchId, input.branchId));
    const no = `PO-${getTodayJalali().replace(/[^0-9]/g, '').slice(0, 6)}-${String(seq.length + 1).padStart(3, '0')}`;

    const { order, items } = await db.transaction(async (dbTx) => {
      const [order] = await dbTx.insert(schema.purchaseOrders).values({
        no,
        branchId: input.branchId,
        supplierId: input.supplierId ?? null,
        status: 'draft',
        expectedDate: input.expectedDate ?? null,
        note: input.note ?? '',
        estTotal,
        createdBy: session.sub,
      }).returning();
      if (!order) throw new ApiError(500, 'خطا در ثبت سفارش خرید', 'INSERT_FAILED');

      for (const it of itemsWithTotal) {
        await dbTx.insert(schema.purchaseOrderItems).values({
          orderId: order.id,
          inventoryItemId: it.inventoryItemId ?? null,
          description: it.description,
          qty: String(it.qty),
          unitCost: it.unitCost ?? 0,
          totalCost: it.totalCost,
        });
      }

      const items = await dbTx.select().from(schema.purchaseOrderItems)
        .where(eq(schema.purchaseOrderItems.orderId, order.id));
      return { order, items };
    });

    audit({ action: 'po.created', userId: session.sub, meta: { orderId: order.id, no: order.no, estTotal } });

    return NextResponse.json({ order: rowToPurchaseOrder(order, items) }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
