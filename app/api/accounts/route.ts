import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession, requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { canAccessSection, canDo } from '@/lib/auth/permissions';

const createSchema = z.object({
  name: z.string().min(2).max(80).transform(v => v.trim()),
  type: z.enum(['cash', 'bank', 'pos', 'partner_equity']).default('cash'),
  branchId: z.string().uuid().nullable().optional(),
});

export async function GET() {
  try {
    const session = await requireSession();
    // فهرست صندوق‌ها در فرم تراکنش، تأیید رسید خرید و صفحه‌ی صندوق‌ها لازم است؛
    // مبلغ موجودی فقط برای کسی که بخش «صندوق‌ها» را دارد برگردانده می‌شود.
    if (!canAccessSection(session, 'accounts') && !canAccessSection(session, 'transactions') && !canDo(session, 'inventory.approve')) {
      throw new ApiError(403, 'دسترسی غیرمجاز', 'FORBIDDEN');
    }
    const showBalance = canAccessSection(session, 'accounts');
    const all = await db
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.isActive, true));
    // غیر SuperAdmin: صندوق‌های شعبه‌ی خودش + صندوق‌های مشترک (بدون شعبه)
    const rows = session.role === 'SuperAdmin'
      ? all
      : all.filter(a => a.branchId == null || a.branchId === session.branchId);
    return NextResponse.json({
      accounts: rows.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        balance: showBalance ? Number(a.balance) : 0,
        isActive: a.isActive,
        branchId: a.branchId,
        partnerId: null, // Faz 3: از DB خواهد آمد بعد از اضافه‌شدن ستون به Drizzle
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const input = createSchema.parse(body);

    const [inserted] = await db
      .insert(schema.accounts)
      .values({ name: input.name, type: input.type, branchId: input.branchId ?? null })
      .returning();

    if (!inserted) throw new ApiError(500, 'خطا در ساخت حساب', 'INSERT_FAILED');

    return NextResponse.json({
      account: {
        id: inserted.id,
        name: inserted.name,
        type: inserted.type,
        balance: Number(inserted.balance),
        isActive: inserted.isActive,
        branchId: inserted.branchId,
        partnerId: null,
        createdAt: inserted.createdAt.toISOString(),
        updatedAt: inserted.updatedAt.toISOString(),
      }
    }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
