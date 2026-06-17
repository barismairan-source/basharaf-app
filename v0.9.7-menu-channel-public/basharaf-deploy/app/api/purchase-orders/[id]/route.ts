import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { rowToPurchaseOrder } from '@/lib/db/operations.serializers';
import { audit } from '@/lib/auth/audit';
import type { PoStatus } from '@/types';

/**
 * PATCH /api/purchase-orders/[id]
 *   - ویرایش اقلام/سرفصل فقط در وضعیت draft
 *   - تغییر وضعیت: draft→sent، draft/sent→cancelled
 *   (دریافت کالا / partial / received در فاز بعدی اضافه می‌شود)
 */

const MONEY_MAX = 100_000_000_000; // ۱۰۰ میلیارد تومان

const itemSchema = z.object({
  inventoryItemId: z.string().uuid().optional().nullable(),
  description: z.string().min(1).max(200),
  qty: z.number().finite().positive().max(1_000_000_000, 'مقدار خیلی بزرگ است'),
  unitCost: z.number().finite('بهای واحد نامعتبر است').min(0).max(MONEY_MAX, 'بهای واحد بیش از حد مجاز است').optional().default(0),
});

const patchPoSchema = z.object({
  supplierId: z.string().uuid().optional().nullable(),
  expectedDate: z.string().max(20).optional().nullable(),
  note: z.string().max(500).optional(),
  status: z.enum(['draft', 'sent', 'cancelled']).optional(),
  items: z.array(itemSchema).min(1, 'حداقل یک قلم لازم است').optional(),
});

const ALLOWED_TRANSITIONS: Record<PoStatus, PoStatus[]> = {
  draft: ['sent', 'cancelled'],
  sent: ['cancelled'],
  partial: [],
  received: [],
  cancelled: [],
};

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();

    const [existing] = await db.select().from(schema.purchaseOrders)
      .where(eq(schema.purchaseOrders.id, params.id)).limit(1);
    if (!existing) throw new ApiError(404, 'سفارش خرید پیدا نشد', 'NOT_FOUND');
    if (session.role === 'BranchUser' && session.branchId !== existing.branchId) {
      throw new ApiError(403, 'شما فقط می‌توانید سفارش‌های شعبه‌ی خود را حذف کنید', 'BRANCH_MISMATCH');
    }
    if (session.role === 'Warehouse') {
      throw new ApiError(403, 'انباردار اجازه‌ی حذف سفارش خرید ندارد', 'FORBIDDEN');
    }
    if (existing.status !== 'draft') {
      throw new ApiError(409, 'فقط سفارش‌های پیش‌نویس قابل حذف هستند', 'INVALID_STATE');
    }

    await db.delete(schema.purchaseOrders).where(eq(schema.purchaseOrders.id, params.id));

    audit({ action: 'po.updated', userId: session.sub, meta: { orderId: existing.id, no: existing.no, deleted: true } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    const input = patchPoSchema.parse(await req.json());

    const [existing] = await db.select().from(schema.purchaseOrders)
      .where(eq(schema.purchaseOrders.id, params.id)).limit(1);
    if (!existing) throw new ApiError(404, 'سفارش خرید پیدا نشد', 'NOT_FOUND');
    if (session.role === 'BranchUser' && session.branchId !== existing.branchId) {
      throw new ApiError(403, 'شما فقط می‌توانید سفارش‌های شعبه‌ی خود را ویرایش کنید', 'BRANCH_MISMATCH');
    }
    if (session.role === 'Warehouse') {
      throw new ApiError(403, 'انباردار اجازه‌ی ویرایش سفارش خرید ندارد', 'FORBIDDEN');
    }

    if (input.items && existing.status !== 'draft') {
      throw new ApiError(409, 'فقط سفارش‌های پیش‌نویس قابل ویرایش اقلام هستند', 'INVALID_STATE');
    }

    if (input.status && input.status !== existing.status) {
      const allowed = ALLOWED_TRANSITIONS[existing.status as PoStatus] ?? [];
      if (!allowed.includes(input.status)) {
        throw new ApiError(409, 'تغییر وضعیت غیرمجاز است', 'INVALID_TRANSITION');
      }
    }

    if (input.supplierId) {
      const [supplier] = await db.select({ id: schema.contacts.id, type: schema.contacts.type })
        .from(schema.contacts).where(eq(schema.contacts.id, input.supplierId)).limit(1);
      if (!supplier) throw new ApiError(404, 'تأمین‌کننده پیدا نشد', 'SUPPLIER_NOT_FOUND');
      if (supplier.type !== 'supplier') {
        throw new ApiError(422, 'طرف‌حساب انتخاب‌شده تأمین‌کننده نیست', 'INVALID_SUPPLIER');
      }
    }

    let itemsWithTotal: Array<{ inventoryItemId: string | null; description: string; qty: number; unitCost: number; totalCost: number }> | null = null;
    let estTotal: number | undefined;
    if (input.items) {
      for (const it of input.items) {
        if (it.inventoryItemId) {
          const [inv] = await db.select({ id: schema.invItems.id })
            .from(schema.invItems).where(eq(schema.invItems.id, it.inventoryItemId)).limit(1);
          if (!inv) throw new ApiError(404, 'قلم انبار پیدا نشد', 'ITEM_NOT_FOUND');
        }
      }
      itemsWithTotal = input.items.map((it) => ({
        inventoryItemId: it.inventoryItemId ?? null,
        description: it.description,
        qty: it.qty,
        unitCost: it.unitCost ?? 0,
        totalCost: Math.round(it.qty * (it.unitCost ?? 0)),
      }));
      estTotal = itemsWithTotal.reduce((s, it) => s + it.totalCost, 0);
    }

    const updateValues: Partial<typeof schema.purchaseOrders.$inferInsert> = {};
    if (input.supplierId !== undefined) updateValues.supplierId = input.supplierId;
    if (input.expectedDate !== undefined) updateValues.expectedDate = input.expectedDate;
    if (input.note !== undefined) updateValues.note = input.note;
    if (input.status !== undefined) updateValues.status = input.status;
    if (estTotal !== undefined) updateValues.estTotal = estTotal;

    const { order, items } = await db.transaction(async (dbTx) => {
      let order = existing;
      if (Object.keys(updateValues).length > 0) {
        const [updated] = await dbTx.update(schema.purchaseOrders)
          .set(updateValues)
          .where(eq(schema.purchaseOrders.id, params.id)).returning();
        if (!updated) throw new ApiError(404, 'سفارش خرید پیدا نشد', 'NOT_FOUND');
        order = updated;
      }

      if (itemsWithTotal) {
        await dbTx.delete(schema.purchaseOrderItems).where(eq(schema.purchaseOrderItems.orderId, params.id));
        for (const it of itemsWithTotal) {
          await dbTx.insert(schema.purchaseOrderItems).values({
            orderId: params.id,
            inventoryItemId: it.inventoryItemId,
            description: it.description,
            qty: String(it.qty),
            unitCost: it.unitCost,
            totalCost: it.totalCost,
          });
        }
      }

      const items = await dbTx.select().from(schema.purchaseOrderItems)
        .where(eq(schema.purchaseOrderItems.orderId, params.id));
      return { order, items };
    });

    audit({ action: 'po.updated', userId: session.sub, meta: { orderId: order.id, changes: input } });

    return NextResponse.json({ order: rowToPurchaseOrder(order, items) });
  } catch (e) {
    return handleError(e);
  }
}
