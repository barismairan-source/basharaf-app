-- ═══════════════════════════════════════════════════════════════════
--  Migration: ثبت ورود/خروج پرسنل فقط از اینترنت (IP ثابت) مغازه
--  فقط ۱ enum + ۳ جدول + index + trigger جدید — هیچ جدول یا ستون موجودی
--  تغییر/حذف نمی‌شود.
--  Idempotent — اجرای چندباره امن است (IF NOT EXISTS / DO $$ EXCEPTION).
--  ⚠️ این فایل روی دیتابیس واقعی اجرا نشده — فقط برای اجرای دستی توسط
--     مدیر پروژه (pgAdmin) پس از تهیه‌ی backup آماده شده است.
--  ترتیب انتشار: اول همین فایل روی دیتابیس، بعد push کد.
--  شرح کامل: project-docs/ATTENDANCE-CLOCK.md
-- ═══════════════════════════════════════════════════════════════════

-- ─── enum ───
DO $$ BEGIN CREATE TYPE attendance_clock_event_type AS ENUM ('clock_in','clock_out');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── branch_attendance_networks — IP/بازه‌ی عمومی مجاز هر شعبه ───
-- فقط مدیر از پنل وارد می‌کند؛ هیچ IPی در کد یا این فایل ثابت نیست.
CREATE TABLE IF NOT EXISTS branch_attendance_networks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  cidr text NOT NULL,
  label text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deactivated_at timestamptz,
  deactivated_by uuid REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS branch_attendance_networks_branch_idx ON branch_attendance_networks(branch_id);
CREATE UNIQUE INDEX IF NOT EXISTS branch_attendance_networks_active_uniq
  ON branch_attendance_networks(branch_id, cidr) WHERE is_active;

-- ─── attendance_clock_devices — لینک شخصی هر نفر و گوشی فعال‌شده با آن ───
-- لینک یک‌بارمصرف است: با اولین باز شدن، یک کلید جدید فقط روی همان گوشی
-- (کوکی httpOnly) ذخیره می‌شود. در دیتابیس فقط هش SHA-256 هر دو نگه داشته می‌شود.
CREATE TABLE IF NOT EXISTS attendance_clock_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  link_token_hash text NOT NULL CONSTRAINT attendance_clock_devices_link_token_hash_unique UNIQUE,
  link_expires_at timestamptz NOT NULL,
  device_token_hash text CONSTRAINT attendance_clock_devices_device_token_hash_unique UNIQUE,
  activated_at timestamptz,
  last_used_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS attendance_clock_devices_employee_idx ON attendance_clock_devices(employee_id);
-- هر نفر در هر لحظه فقط یک لینک/گوشی فعال دارد
CREATE UNIQUE INDEX IF NOT EXISTS attendance_clock_devices_active_uniq
  ON attendance_clock_devices(employee_id) WHERE revoked_at IS NULL;

-- ─── attendance_clock_events — رویداد خام ورود/خروج (فقط افزودنی) ───
-- زمان فقط now() سرور است. IP خام ذخیره نمی‌شود؛ فقط شبکه‌ی تطبیق‌خورده.
-- این رکوردها هرگز حذف/بازنویسی نمی‌شوند؛ اصلاح در attendance_entries انجام
-- می‌شود و رویداد خام به‌عنوان سابقه‌ی اصلی باقی می‌ماند.
CREATE TABLE IF NOT EXISTS attendance_clock_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  event_type attendance_clock_event_type NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  work_date date NOT NULL,
  network_id uuid NOT NULL REFERENCES branch_attendance_networks(id) ON DELETE RESTRICT,
  device_id uuid NOT NULL REFERENCES attendance_clock_devices(id) ON DELETE RESTRICT,
  paired_in_event_id uuid REFERENCES attendance_clock_events(id) ON DELETE RESTRICT,
  attendance_entry_id uuid REFERENCES attendance_entries(id) ON DELETE SET NULL,
  conversion_error text,
  idempotency_key text NOT NULL CONSTRAINT attendance_clock_events_idempotency_key_unique UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attendance_clock_events_pair_check CHECK (
    (event_type = 'clock_out' AND paired_in_event_id IS NOT NULL)
    OR (event_type = 'clock_in' AND paired_in_event_id IS NULL)
  )
);
CREATE INDEX IF NOT EXISTS attendance_clock_events_employee_time_idx ON attendance_clock_events(employee_id, occurred_at);
CREATE INDEX IF NOT EXISTS attendance_clock_events_branch_date_idx ON attendance_clock_events(branch_id, work_date);
-- هر ورود حداکثر یک خروج دارد
CREATE UNIQUE INDEX IF NOT EXISTS attendance_clock_events_paired_uniq
  ON attendance_clock_events(paired_in_event_id) WHERE paired_in_event_id IS NOT NULL;

-- ─── محافظ «فقط افزودنی» در خود دیتابیس ───
-- حذف ممنوع؛ ویرایش فقط برای دو ستون نتیجه‌ی تبدیل به حضور پیش‌نویس
-- (attendance_entry_id — شامل SET NULL وقتی مدیر پیش‌نویس را حذف می‌کند — و conversion_error).
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
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'attendance_clock_events is append-only (only conversion columns may change)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS attendance_clock_events_guard_trg ON attendance_clock_events;
CREATE TRIGGER attendance_clock_events_guard_trg
  BEFORE UPDATE OR DELETE ON attendance_clock_events
  FOR EACH ROW EXECUTE FUNCTION attendance_clock_events_guard();

-- ═══════════════════════════════════════════════════════════════════
--  کوئری‌های بررسی (read-only) — بعد از اجرا
-- ═══════════════════════════════════════════════════════════════════
-- SELECT table_name FROM information_schema.tables
--  WHERE table_name IN ('branch_attendance_networks','attendance_clock_devices','attendance_clock_events');
-- SELECT tgname FROM pg_trigger WHERE tgname = 'attendance_clock_events_guard_trg';

-- ═══════════════════════════════════════════════════════════════════
--  Rollback (فقط اگر لازم شد؛ داده‌ی ثبت‌شده‌ی ورود/خروج را پاک می‌کند —
--  attendance_entries ساخته‌شده از روی آن‌ها باقی می‌مانند)
-- ═══════════════════════════════════════════════════════════════════
-- DROP TRIGGER IF EXISTS attendance_clock_events_guard_trg ON attendance_clock_events;
-- DROP FUNCTION IF EXISTS attendance_clock_events_guard();
-- DROP TABLE IF EXISTS attendance_clock_events;
-- DROP TABLE IF EXISTS attendance_clock_devices;
-- DROP TABLE IF EXISTS branch_attendance_networks;
-- DROP TYPE IF EXISTS attendance_clock_event_type;
