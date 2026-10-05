import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { hashPassword } from '@/lib/auth/password';
import { getClientIp } from '@/lib/auth/rateLimit';
import { audit } from '@/lib/auth/audit';
import { ApiError, handleError } from '@/lib/api-error';

/**
 * POST /api/admin/users/[id]/password — تنظیم رمز جدید توسط مدیر کل.
 *
 * قبلاً هیچ راهی برای بازیابی رمز وجود نداشت: صفحه‌ی «فراموشی رمز» فقط پیام
 * موفقیت نشان می‌داد و تغییر رمز هم رمز فعلی را لازم داشت. حالا مدیر کل رمز
 * موقت می‌گذارد و کاربر بعد از ورود از «تنظیمات ← پروفایل» عوضش می‌کند.
 * رمز هرگز در پاسخ یا audit برگردانده/ذخیره نمی‌شود.
 */
const bodySchema = z.object({
  newPassword: z
    .string()
    .min(8, 'رمز باید حداقل ۸ کاراکتر باشد')
    .max(128)
    .regex(/^(?=.*[a-zA-Z])(?=.*[0-9])/, 'رمز باید حداقل یک حرف و یک عدد داشته باشد'),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    const { newPassword } = bodySchema.parse(await req.json());

    const [updated] = await db.update(schema.users)
      .set({ passwordHash: await hashPassword(newPassword), updatedAt: new Date() })
      .where(eq(schema.users.id, params.id))
      .returning({ id: schema.users.id, name: schema.users.name });
    if (!updated) throw new ApiError(404, 'کاربر یافت نشد', 'NOT_FOUND');

    await audit({
      action: 'admin.user.passwordReset',
      userId: admin.sub,
      ip: getClientIp(req),
      meta: { targetUserId: updated.id, targetName: updated.name },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
