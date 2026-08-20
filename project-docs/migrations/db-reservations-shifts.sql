-- ═══════════════════════════════════════════════════════════════════
--  Migration: ظرفیت واقعی بر اساس میزها + دو شیفت ثابت (ناهار/شام)
--  بعد از db-reservations-daily-capacity.sql — طبق بازخورد دوم کاربر:
--  ظرفیت دیگر یک عدد کلی نیست، بلکه از میزهای واقعی (tables.capacity +
--  ستون جدید is_social) محاسبه می‌شود؛ اسلات‌های ساعتی (حداکثر یک ساعت
--  هر نشست) فقط داخل دو بازه‌ی ثابت امروز: ناهار و شام — هرکدام جدا
--  روشن/خاموش می‌شود.
--  فقط ستون‌های اضافه — چیزی حذف/تغییر نمی‌شود. ستون‌های نسخه‌ی قبلی
--  (is_public_enabled, table_count روی reservation_settings) دست‌نخورده
--  می‌مانند، فقط دیگر اپلیکیشن آن‌ها را نمی‌خواند.
--  Idempotent — اجرای چندباره امن است.
--  ⚠️ این فایل روی دیتابیس واقعی اجرا نشده — فقط برای اجرای دستی توسط
--     مدیر پروژه (pgAdmin) پس از تهیه‌ی backup آماده شده است.
-- ═══════════════════════════════════════════════════════════════════

-- ─── میز اشتراکی/سوشیال — چند رزرو جدا می‌توانند هم‌زمان روی همین میز بنشینند ───
ALTER TABLE tables ADD COLUMN IF NOT EXISTS is_social boolean NOT NULL DEFAULT false;

-- ─── دو شیفت ثابت امروز روی reservation_settings ───
ALTER TABLE reservation_settings ADD COLUMN IF NOT EXISTS lunch_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE reservation_settings ADD COLUMN IF NOT EXISTS lunch_start_hour integer NOT NULL DEFAULT 12;
ALTER TABLE reservation_settings ADD COLUMN IF NOT EXISTS lunch_end_hour integer NOT NULL DEFAULT 16;
ALTER TABLE reservation_settings ADD COLUMN IF NOT EXISTS dinner_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE reservation_settings ADD COLUMN IF NOT EXISTS dinner_start_hour integer NOT NULL DEFAULT 19;
ALTER TABLE reservation_settings ADD COLUMN IF NOT EXISTS dinner_end_hour integer NOT NULL DEFAULT 23;

-- ─── تأیید ───
SELECT 'tables.is_social + reservation_settings shift columns created' AS status;
SELECT b.name, rs.lunch_enabled, rs.lunch_start_hour, rs.lunch_end_hour,
       rs.dinner_enabled, rs.dinner_start_hour, rs.dinner_end_hour
  FROM reservation_settings rs JOIN branches b ON b.id = rs.branch_id;
SELECT b.name, t.name AS table_name, t.capacity, t.is_social
  FROM tables t JOIN branches b ON b.id = t.branch_id
  ORDER BY b.name, t.name;

-- ─── یادآوری برای مدیر — بعد از این migration باید دستی وارد شود ───
-- طبق مشخصات ارسالی، ۵ میز این‌طور تعریف شوند (از پنل «رزرو میز» → «میزها»):
--   میز ۱ (۱،۲) — ظرفیت ۶ — سوشیال: خیر
--   میز ۲ (۳،۴) — ظرفیت ۷ — سوشیال: بله
--   میز ۳ (۵)   — ظرفیت ۲ — سوشیال: خیر
--   میز ۴ (۶)   — ظرفیت ۵ — سوشیال: خیر
--   میز ۵ (۷)   — ظرفیت ۵ — سوشیال: خیر
-- و از تب «تنظیمات رزرو آنلاین»: ساعت ناهار ۱۲ تا ۱۶، ساعت شام ۱۹ تا ۲۳
-- (این‌ها همین الان پیش‌فرض ستون‌ها هستند، فقط باید enabled را روزانه بزنید).

-- ═══════════════════════════════════════════════════════════════════
--  بازگشت (Rollback):
--  ALTER TABLE tables DROP COLUMN IF EXISTS is_social;
--  ALTER TABLE reservation_settings DROP COLUMN IF EXISTS lunch_enabled;
--  ALTER TABLE reservation_settings DROP COLUMN IF EXISTS lunch_start_hour;
--  ALTER TABLE reservation_settings DROP COLUMN IF EXISTS lunch_end_hour;
--  ALTER TABLE reservation_settings DROP COLUMN IF EXISTS dinner_enabled;
--  ALTER TABLE reservation_settings DROP COLUMN IF EXISTS dinner_start_hour;
--  ALTER TABLE reservation_settings DROP COLUMN IF EXISTS dinner_end_hour;
-- ═══════════════════════════════════════════════════════════════════
