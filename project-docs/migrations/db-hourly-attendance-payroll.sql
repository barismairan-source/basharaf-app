-- ═══════════════════════════════════════════════════════════════════
--  Migration: حقوق ساعتی + برنامه شیفت + حضور و غیاب روزانه
--  فقط جداول/enum/index جدید — هیچ جدول یا ستون موجودی تغییر/حذف نمی‌شود.
--  ستون employees.base_monthly_salary فعلاً باقی می‌ماند (سیستم قدیمی
--  ماهانه هنوز فعال است تا سیستم جدید کامل تست شود).
--  Idempotent — اجرای چندباره امن است (IF NOT EXISTS / DO $$ EXCEPTION).
--  همه مبالغ: bigint تومان صحیح. همه محاسبات زمان: دقیقه‌ی صحیح.
--  ⚠️ این فایل روی دیتابیس واقعی اجرا نشده — فقط برای اجرای دستی توسط
--     مدیر پروژه (pgAdmin) پس از تهیه‌ی backup آماده شده است.
-- ═══════════════════════════════════════════════════════════════════

-- ─── enumها (۵ عدد) ───
DO $$ BEGIN CREATE TYPE break_policy AS ENUM ('paid','unpaid','none');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE shift_assignment_status AS ENUM ('scheduled','cancelled','completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE attendance_entry_mode AS ENUM ('time_range','total_minutes');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE attendance_status AS ENUM ('draft','confirmed','locked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE attendance_type AS ENUM
  ('present','absent','paid_leave','unpaid_leave','sick_leave','holiday_work','off_day_work');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── shift_templates ───
CREATE TABLE IF NOT EXISTS shift_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES branches(id) ON DELETE RESTRICT,
  name text NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  planned_minutes integer NOT NULL,
  default_break_minutes integer NOT NULL DEFAULT 0,
  break_policy break_policy NOT NULL DEFAULT 'unpaid',
  crosses_midnight boolean NOT NULL DEFAULT false,
  color text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shift_templates_planned_minutes_check CHECK (planned_minutes > 0 AND planned_minutes <= 1440)
);
CREATE INDEX IF NOT EXISTS shift_templates_branch_idx ON shift_templates(branch_id);
CREATE INDEX IF NOT EXISTS shift_templates_active_idx ON shift_templates(is_active);

-- ─── employee_hourly_rates (نسخه‌دار — نرخ جدید اثری روی دوره‌های قبلی ندارد) ───
CREATE TABLE IF NOT EXISTS employee_hourly_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  hourly_rate bigint NOT NULL,
  effective_from date NOT NULL,
  effective_to date,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  reason text,
  CONSTRAINT employee_hourly_rates_rate_check CHECK (hourly_rate > 0),
  CONSTRAINT employee_hourly_rates_range_check CHECK (effective_to IS NULL OR effective_to >= effective_from)
);
CREATE INDEX IF NOT EXISTS employee_hourly_rates_employee_idx ON employee_hourly_rates(employee_id);
-- توجه: جلوگیری از هم‌پوشانی بازه‌ی نرخ فعال در لایه‌ی API (db.transaction) انجام
-- می‌شود، نه با EXCLUDE constraint — چون آن به extension btree_gist نیاز دارد که
-- ممکن است روی Postgres مدیریت‌شده فعال نباشد. اگر بعداً فعال شد، می‌توان اضافه کرد:
--   CREATE EXTENSION IF NOT EXISTS btree_gist;
--   ALTER TABLE employee_hourly_rates ADD CONSTRAINT employee_hourly_rates_no_overlap
--     EXCLUDE USING gist (employee_id WITH =, daterange(effective_from, COALESCE(effective_to, 'infinity'), '[]') WITH &&);

-- ─── employee_shift_assignments (snapshot از قالب — تغییر بعدی قالب بی‌اثر است) ───
CREATE TABLE IF NOT EXISTS employee_shift_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  branch_id uuid REFERENCES branches(id) ON DELETE RESTRICT,
  work_date date NOT NULL,
  shift_template_id uuid REFERENCES shift_templates(id) ON DELETE SET NULL,
  planned_start_time text NOT NULL,
  planned_end_time text NOT NULL,
  planned_minutes integer NOT NULL,
  break_minutes integer NOT NULL DEFAULT 0,
  break_policy break_policy NOT NULL DEFAULT 'unpaid',
  crosses_midnight boolean NOT NULL DEFAULT false,
  status shift_assignment_status NOT NULL DEFAULT 'scheduled',
  note text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shift_assignments_planned_minutes_check CHECK (planned_minutes > 0 AND planned_minutes <= 1440)
);
CREATE INDEX IF NOT EXISTS shift_assignments_employee_date_idx ON employee_shift_assignments(employee_id, work_date);
CREATE INDEX IF NOT EXISTS shift_assignments_branch_date_idx ON employee_shift_assignments(branch_id, work_date);
CREATE INDEX IF NOT EXISTS shift_assignments_status_idx ON employee_shift_assignments(status);
-- توجه: چند شیفت غیرهم‌پوشان در یک روز مجاز است — پس یکتایی روی
-- (employee_id, work_date) اعمال نشده؛ جلوگیری از هم‌پوشانی زمانی در API.

-- ─── attendance_entries (حضور واقعی — جدا از شیفت برنامه‌ریزی‌شده) ───
CREATE TABLE IF NOT EXISTS attendance_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  branch_id uuid REFERENCES branches(id) ON DELETE RESTRICT,
  work_date date NOT NULL,
  shift_assignment_id uuid REFERENCES employee_shift_assignments(id) ON DELETE SET NULL,
  entry_mode attendance_entry_mode NOT NULL DEFAULT 'time_range',
  clock_in text,
  clock_out text,
  manual_worked_minutes integer,
  break_minutes integer NOT NULL DEFAULT 0,
  worked_minutes integer NOT NULL DEFAULT 0,
  regular_minutes integer NOT NULL DEFAULT 0,
  overtime_minutes integer NOT NULL DEFAULT 0,
  overtime_approved boolean NOT NULL DEFAULT false,
  night_minutes integer NOT NULL DEFAULT 0,
  holiday_minutes integer NOT NULL DEFAULT 0,
  hourly_rate_snapshot bigint NOT NULL DEFAULT 0,
  status attendance_status NOT NULL DEFAULT 'draft',
  attendance_type attendance_type NOT NULL DEFAULT 'present',
  manager_note text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  confirmed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  confirmed_at timestamptz,
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attendance_entries_minutes_check CHECK (
    worked_minutes >= 0 AND worked_minutes <= 1440 AND break_minutes >= 0
  )
);
CREATE INDEX IF NOT EXISTS attendance_entries_employee_date_idx ON attendance_entries(employee_id, work_date);
CREATE INDEX IF NOT EXISTS attendance_entries_branch_date_idx ON attendance_entries(branch_id, work_date);
CREATE INDEX IF NOT EXISTS attendance_entries_status_idx ON attendance_entries(status);
-- یک رکورد حضور به‌ازای هر تخصیص شیفت. NULL چندبار مجاز است (هر NULL یکتاست در
-- Postgres) → یعنی چند رکورد «حضور بدون شیفت» در یک روز آزادانه مجازند.
CREATE UNIQUE INDEX IF NOT EXISTS attendance_entries_assignment_uniq ON attendance_entries(shift_assignment_id);

-- ─── تأیید ───
SELECT 'hourly attendance/payroll tables created' AS status;
SELECT table_name FROM information_schema.tables
  WHERE table_name IN ('shift_templates','employee_hourly_rates','employee_shift_assignments','attendance_entries')
  ORDER BY table_name;

-- ─── کوئری‌های بررسی (بعد از اجرا دستی چک شود) ───
-- SELECT COUNT(*) FROM shift_templates;
-- SELECT COUNT(*) FROM employee_hourly_rates;
-- SELECT COUNT(*) FROM employee_shift_assignments;
-- SELECT COUNT(*) FROM attendance_entries;
-- بررسی هم‌پوشانی نرخ (باید ۰ ردیف برگرداند اگر لایه‌ی API درست کار کرده):
-- SELECT a.employee_id, a.id, b.id FROM employee_hourly_rates a
--   JOIN employee_hourly_rates b ON a.employee_id = b.employee_id AND a.id < b.id
--   WHERE daterange(a.effective_from, COALESCE(a.effective_to,'infinity'), '[]')
--     && daterange(b.effective_from, COALESCE(b.effective_to,'infinity'), '[]');

-- ═══════════════════════════════════════════════════════════════════
--  بازگشت مرحله‌ای (Rollback) — فقط در صورت نیاز واقعی، با احتیاط:
--  DROP TABLE IF EXISTS attendance_entries;
--  DROP TABLE IF EXISTS employee_shift_assignments;
--  DROP TABLE IF EXISTS employee_hourly_rates;
--  DROP TABLE IF EXISTS shift_templates;
--  DROP TYPE IF EXISTS attendance_type;
--  DROP TYPE IF EXISTS attendance_status;
--  DROP TYPE IF EXISTS attendance_entry_mode;
--  DROP TYPE IF EXISTS shift_assignment_status;
--  DROP TYPE IF EXISTS break_policy;
-- ═══════════════════════════════════════════════════════════════════
