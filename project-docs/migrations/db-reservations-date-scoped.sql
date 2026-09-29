-- ═══════════════════════════════════════════════════════════════════
--  Migration: رزرو تاریخ‌دار واقعی + ایمنی ظرفیت پنل + مسدودکردن میز
--  فاز چهارم سیستم رزرو — روی مدل فعلی (tables.is_social + reservations.
--  table_id) سوار می‌شود، جایگزینش نمی‌کند:
--   ۱) reservation_settings: بازه‌ی فعالیت روزانه‌ی واحد (open_hour/close_hour،
--      نه دو شیفت جدا) + روزهای تعطیل. ستون‌های lunch_*/dinner_* قدیمی
--      دست‌نخورده می‌مانند (بی‌ضرر، دیگر خوانده نمی‌شوند) — طبق backfill پایین،
--      تنظیمات شام فعلی (در صورت وجود) مستقیماً به open/close منتقل می‌شود
--      تا رزرو آنلاین شعبه‌ای که از قبل کار می‌کرده قطع نشود.
--   ۲) reservations.booker_name: نام رزروکننده (ممکن است با مهمان اصلی فرق کند).
--   ۳) reservations.idempotency_key: جلوگیری از ثبت دوباره در اثر دوبار لمس/retry.
--   ۴) table_blocks: جدول جدید برای مسدودکردن میز/بازه از پنل.
--  Idempotent — اجرای چندباره امن است. هیچ رزرو/میز موجودی حذف یا دست‌کاری نمی‌شود.
--  ⚠️ این فایل روی دیتابیس واقعی اجرا نشده — فقط برای اجرای دستی توسط
--     مدیر پروژه (pgAdmin/DBeaver) پس از تهیه‌ی backup آماده شده است.
-- ═══════════════════════════════════════════════════════════════════

-- ─── ۱) reservation_settings ────────────────────────────────────────
ALTER TABLE reservation_settings ADD COLUMN IF NOT EXISTS open_hour INTEGER NOT NULL DEFAULT 19;
ALTER TABLE reservation_settings ADD COLUMN IF NOT EXISTS close_hour INTEGER;
ALTER TABLE reservation_settings ADD COLUMN IF NOT EXISTS closed_weekdays JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Backfill: اگر شعبه‌ای شام فعال داشت، همان بازه به open/close منتقل می‌شود.
UPDATE reservation_settings
SET open_hour = dinner_start_hour, close_hour = dinner_end_hour
WHERE dinner_enabled = true AND close_hour IS NULL;

-- اگر فقط ناهار فعال بود (بدون شام)، بازه‌ی ناهار منتقل می‌شود.
UPDATE reservation_settings
SET open_hour = lunch_start_hour, close_hour = lunch_end_hour
WHERE dinner_enabled = false AND lunch_enabled = true AND close_hour IS NULL;

-- ─── ۲) نام رزروکننده ────────────────────────────────────────────────
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS booker_name TEXT;

-- ─── ۳) کلید ضد ثبت‌دوباره ───────────────────────────────────────────
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS reservations_idempotency_key_uniq
  ON reservations(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- ─── ۴) مسدودی میز ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS table_blocks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id    UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  branch_id   UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  date        TEXT NOT NULL,
  start_time  TEXT,
  end_time    TEXT,
  reason      TEXT,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS table_blocks_branch_date_idx ON table_blocks(branch_id, date);
CREATE INDEX IF NOT EXISTS table_blocks_table_date_idx ON table_blocks(table_id, date);

-- ─── تأیید ───
SELECT 'reservations date-scoped migration ready' AS status;
SELECT b.name AS branch, rs.open_hour, rs.close_hour, rs.closed_weekdays
FROM reservation_settings rs JOIN branches b ON b.id = rs.branch_id;
SELECT name, capacity, is_social FROM tables ORDER BY name;

-- ═══════════════════════════════════════════════════════════════════
--  ⚠️ بعد از اجرای این فایل، حتماً بخش «میزها» در پنل رزرو را باز کن و
--  چک کن میزهای فعلی دقیقاً همین ۵ تا باشند (اگر نبودند، دستی اصلاح/حذف
--  کن — نمی‌شد بدون دیدن داده‌ی واقعی حدس زد کدام میز فعلی به کدام‌یک نگاشت می‌شود):
--    الف (۶ نفره) · ب (۴ نفره) · پ (۴ نفره) · ت (۳ نفره) · ث (۷ نفره، سوشیال)
--  همچنین حتماً «ساعت پایان فعالیت» را در تب «تنظیمات رزرو آنلاین» چک کن —
--  اگر خالی بود (یعنی شعبه قبلاً هیچ شیفتی فعال نداشت)، رزرو آنلاین آن شعبه
--  غیرفعال می‌ماند تا خودت صریحاً تنظیمش کنی.
--
--  بازگشت (Rollback):
--  ALTER TABLE reservations DROP COLUMN IF EXISTS booker_name;
--  ALTER TABLE reservations DROP COLUMN IF EXISTS idempotency_key;
--  ALTER TABLE reservation_settings DROP COLUMN IF EXISTS open_hour;
--  ALTER TABLE reservation_settings DROP COLUMN IF EXISTS close_hour;
--  ALTER TABLE reservation_settings DROP COLUMN IF EXISTS closed_weekdays;
--  DROP TABLE IF EXISTS table_blocks;
-- ═══════════════════════════════════════════════════════════════════
