import { NextResponse } from 'next/server';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';
import { notifyAdmins } from '@/lib/notify';
import { desc, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * POST /api/sms/test-notify — تست از مسیر واقعی notifications
 *
 * یک notifyAdmins() واقعی صدا می‌زند با ruleKey='sms.test_notify'.
 * اگر در Settings > پیامک این قانون sms_enabled=true باشد،
 * پیامک هم ارسال می‌شود (در صورت نبود KAVENEGAR_API_KEY → dry_run در sms_log).
 */
export async function POST() {
  try {
    const session = await requireAdmin();

    await notifyAdmins(
      {
        type: 'info',
        title: 'اعلان آزمایشی پیامک',
        sub: `درخواست توسط ${session.sub} — مسیر کامل notify→SMS`,
        txId: null,
        actionUrl: '/settings',
        entityId: `test-${Date.now()}`,
        ruleKey: 'sms.test_notify',
      },
      undefined,
      { sms: true }
    );

    // آخرین ردیف sms_log مربوط به این تست را برمی‌گرداند
    const [lastLog] = await db
      .select({
        id: schema.smsLog.id,
        status: schema.smsLog.status,
        phone: schema.smsLog.phone,
        createdAt: schema.smsLog.createdAt,
      })
      .from(schema.smsLog)
      .where(eq(schema.smsLog.templateKey, 'sms.test_notify'))
      .orderBy(desc(schema.smsLog.createdAt))
      .limit(1);

    return NextResponse.json({
      ok: true,
      notificationCreated: true,
      smsLog: lastLog
        ? {
            id: lastLog.id,
            status: lastLog.status,
            phone: lastLog.phone,
            createdAt: lastLog.createdAt.toISOString(),
          }
        : null,
      hint: lastLog
        ? undefined
        : 'پیامک ارسال نشد — اطمینان حاصل کنید sms_enabled برای sms.test_notify روشن باشد و sms_phone برای حساب‌های SuperAdmin تنظیم شده باشد',
    });
  } catch (e) {
    return handleError(e);
  }
}
