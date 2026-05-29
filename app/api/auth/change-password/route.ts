import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { verifyPassword, hashPassword } from '@/lib/auth/password';
import { requireSession } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';

/**
 * POST /api/auth/change-password
 *
 * کاربر می‌تواند رمز خودش را تغییر دهد.
 * نیاز به رمز فعلی دارد — حتی admin نمی‌تواند رمز دیگران را تغییر دهد.
 */

const bodySchema = z.object({
  currentPassword: z.string().min(1, 'رمز فعلی الزامی است'),
  newPassword: z
    .string()
    .min(8, 'رمز جدید باید حداقل ۸ کاراکتر باشد')
    .max(128)
    .regex(
      /^(?=.*[a-zA-Z])(?=.*[0-9])/,
      'رمز جدید باید حداقل یک حرف و یک عدد داشته باشد'
    ),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'رمز جدید و تکرار آن یکسان نیستند',
  path: ['confirmPassword'],
});

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const { currentPassword, newPassword } = bodySchema.parse(body);

    // دریافت user از DB
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, session.sub))
      .limit(1);

    if (!user) {
      throw new ApiError(404, 'کاربر پیدا نشد', 'USER_NOT_FOUND');
    }

    // verify رمز فعلی
    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      throw new ApiError(401, 'رمز فعلی نادرست است', 'WRONG_PASSWORD');
    }

    // hash رمز جدید
    const newHash = await hashPassword(newPassword);

    await db
      .update(schema.users)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(schema.users.id, session.sub));

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
