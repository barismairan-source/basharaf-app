import { NextResponse } from 'next/server';
import { eq, sql, and, isNull, or } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';

const actionSchema = z.object({
  action: z.enum(['delete', 'convert']),
});

/**
 * POST /api/admin/contact-cleanup/[id]
 *
 * action=delete  : حذف واقعی — فقط اگر linked_tx_count=0 و balance=0
 * action=convert : تبدیل به دسته — atomic:
 *   ۱. تراکنش‌های با categoryName خالی: نام contact کپی می‌شود
 *   ۲. contactId همه تراکنش‌های لینک‌شده → NULL
 *   ۳. contact غیرفعال (isActive=false)
 *   ۴. audit log
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin();
    const body = await req.json();
    const { action } = actionSchema.parse(body);

    const contactId = params.id;

    // بررسی وجود contact
    const [contact] = await db
      .select()
      .from(schema.contacts)
      .where(eq(schema.contacts.id, contactId));

    if (!contact) {
      throw new ApiError(404, 'طرف‌حساب پیدا نشد', 'NOT_FOUND');
    }

    // شمارش تراکنش‌های لینک‌شده — server-side (نه اعتماد به client)
    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.transactions)
      .where(eq(schema.transactions.contactId, contactId));
    const linkedCount = countRow?.count ?? 0;

    // balance از record موجود (cache) — به‌روز است چون isCredit تراکنش‌ها آپدیت می‌کنند
    const balance = contact.balance;

    if (action === 'delete') {
      if (linkedCount > 0) {
        throw new ApiError(400, 'این طرف‌حساب تراکنش دارد — ابتدا روابط را قطع کنید', 'HAS_TRANSACTIONS');
      }
      if (balance !== 0) {
        throw new ApiError(400, 'مانده‌ی نسیه دارد — اول تسویه', 'HAS_BALANCE');
      }

      await db.transaction(async (tx) => {
        await tx.delete(schema.contacts).where(eq(schema.contacts.id, contactId));
        await tx.insert(schema.auditLog).values({
          userId: session.sub,
          action: 'contact.cleanup.delete',
          meta: JSON.stringify({ contactId, contactName: contact.name }),
        });
      });

      return NextResponse.json({ ok: true, action: 'deleted' });
    }

    // action === 'convert'
    if (balance !== 0) {
      throw new ApiError(400, 'مانده‌ی نسیه دارد — اول تسویه', 'HAS_BALANCE');
    }

    await db.transaction(async (tx) => {
      if (linkedCount > 0) {
        // ۱. اگر categoryName خالی است → نام contact را کپی کن تا معنا حفظ شود
        await tx
          .update(schema.transactions)
          .set({ categoryName: contact.name })
          .where(
            and(
              eq(schema.transactions.contactId, contactId),
              or(
                isNull(schema.transactions.categoryId),
                eq(schema.transactions.categoryName, '')
              )
            )
          );

        // ۲. contactId همه تراکنش‌های لینک‌شده را NULL کن
        await tx
          .update(schema.transactions)
          .set({ contactId: null })
          .where(eq(schema.transactions.contactId, contactId));
      }

      // ۳. contact را غیرفعال کن
      await tx
        .update(schema.contacts)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(schema.contacts.id, contactId));

      // ۴. audit log
      await tx.insert(schema.auditLog).values({
        userId: session.sub,
        action: 'contact.cleanup.convert',
        meta: JSON.stringify({
          contactId,
          contactName: contact.name,
          txCount: linkedCount,
        }),
      });
    });

    return NextResponse.json({ ok: true, action: 'converted', txCount: linkedCount });
  } catch (e) {
    return handleError(e);
  }
}
