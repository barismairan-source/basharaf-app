-- ═══════════════════════════════════════════════════════════════════
--  Migration: نوع حقوق صریح (compensationType) + گزارش حسابرسی تغییر آن
--  فاز ۱ یکپارچه‌سازی منابع انسانی.
--  Idempotent — اجرای چندباره امن است.
--  ⚠️ این فایل روی دیتابیس واقعی اجرا نشده — فقط برای اجرای دستی توسط
--     مدیر پروژه (pgAdmin) پس از تهیه‌ی backup آماده شده است.
-- ═══════════════════════════════════════════════════════════════════

-- ─── enum ───
DO $$ BEGIN CREATE TYPE compensation_type AS ENUM ('hourly','monthly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── ستون جدید روی employees ───
ALTER TABLE employees ADD COLUMN IF NOT EXISTS compensation_type compensation_type NOT NULL DEFAULT 'monthly';

-- ─── جدول گزارش حسابرسی تغییر نوع حقوق ───
CREATE TABLE IF NOT EXISTS employee_compensation_type_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  from_type compensation_type NOT NULL,
  to_type compensation_type NOT NULL,
  effective_from date NOT NULL,
  changed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS employee_compensation_type_changes_employee_idx ON employee_compensation_type_changes(employee_id);

-- ─── Backfill — کارمندانی که از قبل نرخ ساعتی دارند، نوع حقوق‌شان hourly شود ───
-- (بدون تغییر در فیش‌های گذشته — payslips.calc_snapshot مستقل و immutable است.)
UPDATE employees
SET compensation_type = 'hourly'
WHERE compensation_type = 'monthly'
  AND id IN (SELECT DISTINCT employee_id FROM employee_hourly_rates);

-- ─── تأیید ───
SELECT 'compensation_type backfill done' AS status;
SELECT compensation_type, COUNT(*) FROM employees GROUP BY compensation_type;

-- ─── کوئری‌های بررسی پیش/پس از اجرا ───
-- قبل: چند کارمند نرخ ساعتی دارند ولی هنوز compensation_type='monthly' نشده؟ (باید بعد از backfill صفر شود)
-- SELECT COUNT(DISTINCT e.id) FROM employees e
--   JOIN employee_hourly_rates r ON r.employee_id = e.id
--   WHERE e.compensation_type = 'monthly';
-- بعد: کارمندان ماهانه بدون حقوق پایه‌ی معتبر (باید قبل از محاسبه‌ی حقوق دستی بررسی شوند):
-- SELECT id, full_name FROM employees WHERE compensation_type = 'monthly' AND base_monthly_salary <= 0 AND is_active = true;

-- ═══════════════════════════════════════════════════════════════════
--  بازگشت (Rollback) — فقط در صورت نیاز واقعی:
--  ALTER TABLE employees DROP COLUMN IF EXISTS compensation_type;
--  DROP TABLE IF EXISTS employee_compensation_type_changes;
--  DROP TYPE IF EXISTS compensation_type;
-- ═══════════════════════════════════════════════════════════════════
