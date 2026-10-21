-- ═══════════════════════════════════════════════════════════════════
--  Migration: تأیید ثبت حضور با Face ID/اثر انگشت (WebAuthn passkey)
--  پیش‌نیاز: db-attendance-clock.sql قبلاً اجرا شده باشد.
--  فقط ستون جدید (با مقدار پیش‌فرض) + یک تنظیم — هیچ ستون یا داده‌ای حذف نمی‌شود.
--  Idempotent — اجرای چندباره امن است.
--  ⚠️ روی دیتابیس واقعی اجرا نشده — اجرای دستی در pgAdmin پس از backup.
--  ترتیب انتشار: اول همین فایل روی دیتابیس، بعد push کد
--  (کد جدید این ستون‌ها را می‌خواند؛ بدون این فایل ثبت حضور کار نمی‌کند).
--  شرح: project-docs/ATTENDANCE-CLOCK.md
-- ═══════════════════════════════════════════════════════════════════

-- ─── گوشی‌ها: کلید عمومی passkey (هیچ داده‌ی بیومتریکی ذخیره نمی‌شود) ───
ALTER TABLE attendance_clock_devices ADD COLUMN IF NOT EXISTS passkey_credential_id text;
ALTER TABLE attendance_clock_devices ADD COLUMN IF NOT EXISTS passkey_public_key text;
ALTER TABLE attendance_clock_devices ADD COLUMN IF NOT EXISTS passkey_counter bigint NOT NULL DEFAULT 0;
ALTER TABLE attendance_clock_devices ADD COLUMN IF NOT EXISTS passkey_transports text;
ALTER TABLE attendance_clock_devices ADD COLUMN IF NOT EXISTS passkey_rp_id text;
ALTER TABLE attendance_clock_devices ADD COLUMN IF NOT EXISTS passkey_registered_at timestamptz;
ALTER TABLE attendance_clock_devices ADD COLUMN IF NOT EXISTS passkey_challenge text;
ALTER TABLE attendance_clock_devices ADD COLUMN IF NOT EXISTS passkey_challenge_expires_at timestamptz;
ALTER TABLE attendance_clock_devices ADD COLUMN IF NOT EXISTS face_id_exempt boolean NOT NULL DEFAULT false;
DO $$ BEGIN
  ALTER TABLE attendance_clock_devices
    ADD CONSTRAINT attendance_clock_devices_passkey_credential_id_unique UNIQUE (passkey_credential_id);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- ─── رویدادها: آیا ثبت با Face ID/اثر انگشت تأیید شد؟ ───
-- (ADD COLUMN با DEFAULT هیچ trigger ردیفی را اجرا نمی‌کند؛ رویدادهای قبلی false می‌گیرند.)
ALTER TABLE attendance_clock_events ADD COLUMN IF NOT EXISTS user_verified boolean NOT NULL DEFAULT false;

-- محافظ «فقط افزودنی»: user_verified هم بعد از ثبت قابل تغییر نیست.
CREATE OR REPLACE FUNCTION attendance_clock_events_guard() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'attendance_clock_events is append-only (delete not allowed)';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.employee_id IS DISTINCT FROM OLD.employee_id
     OR NEW.branch_id IS DISTINCT FROM OLD.branch_id
     OR NEW.event_type IS DISTINCT FROM OLD.event_type
     OR NEW.occurred_at IS DISTINCT FROM OLD.occurred_at
     OR NEW.work_date IS DISTINCT FROM OLD.work_date
     OR NEW.network_id IS DISTINCT FROM OLD.network_id
     OR NEW.device_id IS DISTINCT FROM OLD.device_id
     OR NEW.paired_in_event_id IS DISTINCT FROM OLD.paired_in_event_id
     OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
     OR NEW.user_verified IS DISTINCT FROM OLD.user_verified
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'attendance_clock_events is append-only (only conversion columns may change)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── تنظیم: الزام Face ID/اثر انگشت (پیش‌فرض روشن؛ از پنل قابل خاموش‌کردن) ───
INSERT INTO app_settings (key, value, label, "group")
VALUES ('attendance.clock.requireFaceId', 'true', 'ثبت حضور با Face ID / اثر انگشت', 'attendance')
ON CONFLICT (key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
--  کوئری بررسی (read-only)
-- ═══════════════════════════════════════════════════════════════════
-- SELECT column_name FROM information_schema.columns
--  WHERE table_name = 'attendance_clock_devices' AND column_name LIKE 'passkey%';
-- SELECT * FROM app_settings WHERE key = 'attendance.clock.requireFaceId';

-- ═══════════════════════════════════════════════════════════════════
--  Rollback (فقط اگر لازم شد — اول کد قبلی را برگردانید)
-- ═══════════════════════════════════════════════════════════════════
-- DELETE FROM app_settings WHERE key = 'attendance.clock.requireFaceId';
-- ALTER TABLE attendance_clock_events DROP COLUMN IF EXISTS user_verified;
-- ALTER TABLE attendance_clock_devices DROP CONSTRAINT IF EXISTS attendance_clock_devices_passkey_credential_id_unique;
-- ALTER TABLE attendance_clock_devices DROP COLUMN IF EXISTS face_id_exempt, DROP COLUMN IF EXISTS passkey_challenge_expires_at,
--   DROP COLUMN IF EXISTS passkey_challenge, DROP COLUMN IF EXISTS passkey_registered_at, DROP COLUMN IF EXISTS passkey_rp_id,
--   DROP COLUMN IF EXISTS passkey_transports, DROP COLUMN IF EXISTS passkey_counter, DROP COLUMN IF EXISTS passkey_public_key,
--   DROP COLUMN IF EXISTS passkey_credential_id;
--  (تابع guard را هم با نسخه‌ی db-attendance-clock.sql جایگزین کنید.)
