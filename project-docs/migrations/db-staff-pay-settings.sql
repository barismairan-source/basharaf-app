-- ═══════════════════════════════════════════════════════════════════
--  Migration: تنظیم حقوق هر نفر (عنوان، حقوق ثابت، روش و ضریب اضافه‌کاری) برای پنل پرسنل و صفحه‌ی مدیر
--  فقط ۱ جدول جدید؛ هیچ جدول موجودی تغییر نمی‌کند. ریز کارکردهای ثبت‌شده و حسابداری دست نمی‌خورند.
--  Idempotent — اجرای چندباره امن است. ترتیب انتشار: اول همین فایل، بعد کد.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS staff_pay_settings (
  employee_id uuid PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  pay_title text,
  model text NOT NULL,
  agreed_salary bigint NOT NULL,
  standard_hours integer NOT NULL DEFAULT 208,
  overtime_multiplier numeric(4,2) NOT NULL DEFAULT 1.40,
  base_days integer NOT NULL DEFAULT 24,
  bonus_every_shifts integer NOT NULL DEFAULT 6,
  full_salary boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT staff_pay_settings_model_check CHECK (model IN ('hourly', 'daily')),
  CONSTRAINT staff_pay_settings_salary_check CHECK (agreed_salary > 0)
);

-- کوئری بررسی (read-only): SELECT count(*) FROM staff_pay_settings;
-- Rollback: DROP TABLE IF EXISTS staff_pay_settings;
