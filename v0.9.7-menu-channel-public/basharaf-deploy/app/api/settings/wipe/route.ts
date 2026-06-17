import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { audit } from '@/lib/auth/audit';

/**
 * POST /api/settings/wipe — عملیات بسیار خطرناک «منطقهٔ خطر».
 *
 * فقط SuperAdmin. نیازمند عبارت تاییدی دقیق برای جلوگیری از کلیک تصادفی.
 *
 * target:
 *   'factory_reset' — بازگشت به تنظیمات کارخانه: تمام داده‌های عملیاتی و
 *      master data (منو، دستور پخت، مشتریان، انبار، تراکنش‌ها، ...) پاک می‌شود
 *      اما کاربران/نقش‌ها، شعب، و تنظیمات سامانه دست‌نخورده باقی می‌مانند تا
 *      مدیر هرگز از سامانه بیرون نماند.
 *
 * استراتژی: TRUNCATE ... CASCADE به‌صورت اتمیک — به‌جای حذف رابطه‌ای ردیف‌به‌ردیف
 * (که با حجم بالا مستعد deadlock/کندی است).
 */

const bodySchema = z.object({
  target: z.literal('factory_reset'),
  confirmPhrase: z.string(),
});

const CONFIRM_PHRASE = 'تایید حذف کل سیستم';

// جداولی که TRUNCATE می‌شوند — تمام داده‌های عملیاتی + master data دامنه‌ی کسب‌وکار.
// ترتیب مهم نیست چون CASCADE روابط وابسته را هم پاک می‌کند، اما همه را صریح
// فهرست می‌کنیم تا چیزی فراموش نشود و TRUNCATE اتمیک روی همه باهم اجرا شود.
const FACTORY_RESET_TABLES = [
  // حسابداری/تراکنش‌ها
  'transactions',
  'journal_vouchers',
  // انبار و آشپزخانه (و دستور پخت)
  'inv_stock_tx',
  'inv_voucher_lines',
  'inv_vouchers',
  'inv_daily_sales',
  'inv_recipe_lines',
  'inv_recipes',
  'inv_items',
  // منو
  'menu_items',
  'menu_categories',
  // مشتریان و وفاداری
  'loyalty_entries',
  'coupon_redemptions',
  'coupons',
  'feedback',
  'reservations',
  'customers',
  // میزها
  'tables',
  // اعلان‌ها (داده‌ی عملیاتی، نه master)
  'notifications',
] as const;

// STRICT EXEMPTION — هرگز این جداول را TRUNCATE نکن، وگرنه مدیر از سامانه قفل می‌شود:
//   users, branches, app_settings  (و هیچ جدول «roles» مجزایی در schema نیست —
//   نقش روی ستون متنی users.role نگه‌داری می‌شود)

export async function POST(req: Request) {
  try {
    const session = await requireAdmin();

    const { target, confirmPhrase } = bodySchema.parse(await req.json());

    if (confirmPhrase !== CONFIRM_PHRASE) {
      throw new ApiError(400, 'عبارت تاییدی اشتباه است', 'CONFIRM_PHRASE_MISMATCH');
    }

    if (target !== 'factory_reset') {
      throw new ApiError(400, 'هدف نامعتبر است', 'INVALID_TARGET');
    }

    const tableList = FACTORY_RESET_TABLES.join(', ');
    await db.execute(sql.raw(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE;`));

    audit({
      action: 'settings.factoryReset',
      userId: session.sub,
      meta: { truncatedTables: FACTORY_RESET_TABLES },
    });

    return NextResponse.json({
      ok: true,
      truncatedTables: FACTORY_RESET_TABLES,
      preserved: ['users', 'branches', 'app_settings'],
    });
  } catch (e) {
    return handleError(e);
  }
}
