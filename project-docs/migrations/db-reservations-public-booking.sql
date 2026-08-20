-- ═══════════════════════════════════════════════════════════════════
--  Migration: سیستم رزرو عمومی — فاز ۱
--  ستون‌های جدید (nullable) روی reservations + جدول جدید reservation_settings.
--  هیچ داده‌ای حذف/تغییر نمی‌شود؛ رزروهای قدیمی دست‌نخورده می‌مانند.
--  Idempotent — اجرای چندباره امن است.
--  ⚠️ این فایل روی دیتابیس واقعی اجرا نشده — فقط برای اجرای دستی توسط
--     مدیر پروژه (pgAdmin) پس از تهیه‌ی backup آماده شده است.
-- ═══════════════════════════════════════════════════════════════════

-- ─── ستون‌های جدید روی reservations ───
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS guest_name text;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS guest_phone text;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS tracking_code text;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS canceled_reason text;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'staff';
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS reserve_at timestamptz;

-- created_by دیگر الزامی نیست — رزرو عمومی هیچ کاربر واردشده‌ای ندارد.
-- رزروهای موجود (که همه created_by دارند) دست‌نخورده می‌مانند.
ALTER TABLE reservations ALTER COLUMN created_by DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS reservations_tracking_code_uniq
  ON reservations(tracking_code) WHERE tracking_code IS NOT NULL;

-- مهمان بدون عضویت باید نام+موبایل داشته باشد؛ رزرو با عضویت باید customer_id داشته باشد.
DO $$ BEGIN
  ALTER TABLE reservations ADD CONSTRAINT reservations_customer_or_guest_check
    CHECK (customer_id IS NOT NULL OR (guest_name IS NOT NULL AND guest_phone IS NOT NULL));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── جدول تنظیمات رزرو عمومی هر شعبه ───
CREATE TABLE IF NOT EXISTS reservation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  is_public_enabled boolean NOT NULL DEFAULT false,
  working_days jsonb,
  open_time text NOT NULL DEFAULT '12:00',
  close_time text NOT NULL DEFAULT '23:00',
  slot_minutes integer NOT NULL DEFAULT 30,
  slot_capacity_guests integer NOT NULL DEFAULT 40,
  max_party_size integer NOT NULL DEFAULT 12,
  min_lead_minutes integer NOT NULL DEFAULT 60,
  max_lead_days integer NOT NULL DEFAULT 30,
  blackout_dates jsonb NOT NULL DEFAULT '[]',
  max_active_reservations_per_phone integer NOT NULL DEFAULT 3,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reservation_settings_hours_check CHECK (close_time > open_time),
  CONSTRAINT reservation_settings_slot_minutes_check CHECK (slot_minutes > 0 AND slot_minutes <= 240)
);
CREATE UNIQUE INDEX IF NOT EXISTS reservation_settings_branch_uniq ON reservation_settings(branch_id);

-- ─── قانون اعلان برای رزرو عمومی جدید (idempotent) ───
INSERT INTO notification_rules (key, label, description, enabled, sms_enabled, in_app_enabled, threshold)
VALUES (
  'reservations.new_public',
  'رزرو عمومی جدید',
  'اعلان وقتی مهمان از صفحه‌ی عمومی رزرو ثبت می‌کند',
  true,
  false,
  true,
  NULL
)
ON CONFLICT (key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
--  توجه: صفحه‌ی عمومی رزرو تا وقتی برای یک شعبه isPublicEnabled=true
--  تنظیم نشود، هیچ شعبه‌ای را نمایش نمی‌دهد (پیش‌فرض ستون false است).
--  فعال‌سازی از پنل مدیریت (تب تنظیمات رزرو در /reservations) یا مستقیم:
--    INSERT INTO reservation_settings (branch_id, is_public_enabled)
--    VALUES ('<BRANCH_UUID>', true)
--    ON CONFLICT (branch_id) DO UPDATE SET is_public_enabled = true;
-- ═══════════════════════════════════════════════════════════════════

-- ─── تأیید ───
SELECT 'reservations public-booking columns created' AS status;
SELECT COUNT(*) AS reservation_settings_rows FROM reservation_settings;

-- ─── کوئری‌های بررسی ───
-- قبل: همه‌ی رزروهای موجود باید customer_id داشته باشند (وگرنه CHECK جدید رد می‌کند):
-- SELECT id, date, time FROM reservations WHERE customer_id IS NULL AND (guest_name IS NULL OR guest_phone IS NULL);
-- بعد: کدام شعب رزرو عمومی را فعال کرده‌اند:
-- SELECT b.name, rs.is_public_enabled FROM reservation_settings rs JOIN branches b ON b.id = rs.branch_id;

-- ═══════════════════════════════════════════════════════════════════
--  بازگشت (Rollback):
--  ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_customer_or_guest_check;
--  DROP INDEX IF EXISTS reservations_tracking_code_uniq;
--  ALTER TABLE reservations DROP COLUMN IF EXISTS guest_name;
--  ALTER TABLE reservations DROP COLUMN IF EXISTS guest_phone;
--  ALTER TABLE reservations DROP COLUMN IF EXISTS tracking_code;
--  ALTER TABLE reservations DROP COLUMN IF EXISTS canceled_reason;
--  ALTER TABLE reservations DROP COLUMN IF EXISTS source;
--  ALTER TABLE reservations DROP COLUMN IF EXISTS reserve_at;
--  ALTER TABLE reservations ALTER COLUMN created_by SET NOT NULL; -- فقط اگر هیچ رزرو عمومی (created_by IS NULL) ثبت نشده باشد
--  DROP TABLE IF EXISTS reservation_settings;
--  DELETE FROM notification_rules WHERE key = 'reservations.new_public';
-- ═══════════════════════════════════════════════════════════════════
