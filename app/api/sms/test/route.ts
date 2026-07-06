import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';
import { sendSms } from '@/lib/sms/sendSms';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  /** شماره مقصد — اگر نداد، از sms_phone کاربر فعلی استفاده می‌شود */
  phone: z.string().min(10).max(15).optional(),
  message: z.string().min(1).max(160).optional(),
});

/** POST /api/sms/test — ارسال پیامک آزمایشی (فقط SuperAdmin) */
export async function POST(req: Request) {
  try {
    const session = await requireAdmin();
    const body = bodySchema.parse(await req.json());

    let phone = body.phone;
    if (!phone) {
      const [user] = await db
        .select({ smsPhone: schema.users.smsPhone })
        .from(schema.users)
        .where(eq(schema.users.id, session.sub))
        .limit(1);
      phone = user?.smsPhone ?? undefined;
    }

    if (!phone) {
      return NextResponse.json(
        { error: 'شماره موبایل تنظیم نشده', code: 'NO_PHONE' },
        { status: 400 }
      );
    }

    const message = body.message ?? 'پیامک آزمایشی از سامانه با شرف ✔';

    const result = await sendSms({ phone, message, templateKey: 'test' });

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return handleError(e);
  }
}
