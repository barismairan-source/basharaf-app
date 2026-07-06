import { NextResponse } from 'next/server';
import { eq, count } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession, requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

/** GET /api/users/[id] — دریافت اطلاعات یک کاربر */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession();
    if (session.role !== 'SuperAdmin' && session.sub !== params.id) {
      throw new ApiError(403, 'دسترسی مجاز نیست', 'FORBIDDEN');
    }
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, params.id))
      .limit(1);
    if (!user) throw new ApiError(404, 'کاربر پیدا نشد', 'NOT_FOUND');
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        assignedBranch: user.assignedBranchId,
        initials: user.initials,
        smsPhone: user.smsPhone ?? null,
        permissions: user.permissions ?? null,
      },
    });
  } catch (e) {
    return handleError(e);
  }
}

const patchBodySchema = z.object({
  name: z.string().min(2).max(80).optional(),
  email: z
    .string()
    .email()
    .max(254)
    .transform((v) => v.trim().toLowerCase())
    .optional(),
  permissions: z.array(z.string().max(40)).max(20).nullable().optional(),
  smsPhone: z
    .string()
    .regex(/^(\+98|0)?9\d{9}$/, 'شماره موبایل نامعتبر است')
    .nullable()
    .optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const input = patchBodySchema.parse(body);

    // فقط می‌تواند خود را ویرایش کند، یا اگر admin است هر کسی را
    if (session.role !== 'SuperAdmin' && session.sub !== params.id) {
      throw new ApiError(403, 'دسترسی به ویرایش این کاربر ندارید', 'FORBIDDEN');
    }

    // permissions را فقط مدیر کل می‌تواند تغییر دهد (نه کاربر روی خودش)
    if (input.permissions !== undefined && session.role !== 'SuperAdmin') {
      throw new ApiError(403, 'فقط مدیر کل می‌تواند دسترسی‌ها را تغییر دهد', 'FORBIDDEN');
    }

    // اگر email تغییر می‌کند، چک duplicate
    if (input.email) {
      const [existing] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, input.email))
        .limit(1);
      if (existing && existing.id !== params.id) {
        throw new ApiError(409, 'این ایمیل قبلاً ثبت شده است', 'DUPLICATE');
      }
    }

    const [updated] = await db
      .update(schema.users)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(schema.users.id, params.id))
      .returning();

    if (!updated) {
      throw new ApiError(404, 'کاربر پیدا نشد', 'USER_NOT_FOUND');
    }

    return NextResponse.json({
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        assignedBranch: updated.assignedBranchId,
        initials: updated.initials,
        lastSeen: updated.lastSeen,
        joined: updated.joined,
        permissions: updated.permissions ?? null,
      },
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin();
    if (session.sub === params.id) {
      throw new ApiError(
        400,
        'نمی‌توانید حساب خودتان را حذف کنید',
        'SELF_DELETE'
      );
    }

    const txRows = await db.select({ total: count() }).from(schema.transactions)
      .where(eq(schema.transactions.createdBy, params.id));
    const total = txRows[0]?.total ?? 0;
    if (total > 0) {
      const formatted = new Intl.NumberFormat('fa-IR').format(total);
      throw new ApiError(
        409,
        `این کاربر ${formatted} تراکنش ثبت‌شده دارد و قابل حذف نیست.`,
        'HAS_TRANSACTIONS',
      );
    }

    const result = await db
      .delete(schema.users)
      .where(eq(schema.users.id, params.id))
      .returning({ id: schema.users.id });

    if (result.length === 0) {
      throw new ApiError(404, 'کاربر پیدا نشد', 'USER_NOT_FOUND');
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
