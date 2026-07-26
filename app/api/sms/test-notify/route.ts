import { NextResponse } from 'next/server';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';
import { notifyAdmins } from '@/lib/notify';
import { processOutboxBatch } from '@/lib/notifications/processor';
import { desc, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * POST /api/sms/test-notify — تست از مسیر واقعی notifications
 *
 * یک notifyAdmins() واقعی صدا می‌زند با ruleKey='sms.test_notify'؛ خودِ ارسال
 * SMS به‌صورت async از طریق notification_outbox انجام می‌شود (پردازش دوره‌ای
 * هر ۶۰ ثانیه توسط instrumentation.ts). برای این‌که دکمه‌ی «تست کامل» نتیجه‌ی
 * واقعی و فوری نشون بده (نه این‌که کاربر مجبور باشه تا ۶۰ ثانیه صبر کنه و
 * دستی رفرش بزنه)، همینجا یک batch پردازش دستی هم صدا زده می‌شود — همون
 * تابعی که scheduler هر ۶۰ ثانیه صدا می‌زند، امن برای فراخوانی موازی
 * (row-locking با FOR UPDATE SKIP LOCKED).
 */
export async function POST() {
  try {
    const session = await requireAdmin();

    await notifyAdmins(
      {
        type: 'info',
        title: 'اعلان آزمایشی پیامک',
        // متن ساده و کاملاً فارسی — نسخه‌ی قبلی UUID کاربر + کلمات انگلیسی
        // (notify→SMS) را داخل متن می‌گذاشت که فیلتر محتوای ملی‌پیامک آن را
        // «کلمه فیلتر شده» تشخیص می‌داد؛ پیام واقعی هر قانون تولیدی همیشه
        // متن ساده‌ی فارسی است، پس این تست باید همان الگو را دنبال کند.
        sub: 'این یک پیام آزمایشی برای بررسی مسیر ارسال پیامک است.',
        txId: null,
        actionUrl: '/settings',
        entityId: `test-${Date.now()}`,
        ruleKey: 'sms.test_notify',
      },
      undefined,
      { sms: true }
    );

    await processOutboxBatch();

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
