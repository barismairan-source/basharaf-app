-- ═══════════════════════════════════════════════════════════════════
--  Migration: ریز کارکرد و محاسبه‌ی حقوق ماهانه‌ی پرسنل (برای پنل پرسنل /me)
--  فقط ۱ جدول جدید — هیچ جدول یا ستون موجودی تغییر نمی‌کند و به payslips/payroll_runs ربطی ندارد.
--  Idempotent — اجرای چندباره امن است.
--  ⚠️ روی دیتابیس واقعی اجرا نشده — اجرای دستی در pgAdmin پس از backup.
--  ترتیب انتشار: اول همین فایل، بعد push کد (کد جدید این جدول را می‌خواند).
--  شرح: project-docs/STAFF-PANEL.md
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS staff_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  period_year_month text NOT NULL,
  model text NOT NULL,
  title text NOT NULL,
  basis jsonb NOT NULL,
  weeks jsonb NOT NULL DEFAULT '[]'::jsonb,
  lines jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_amount bigint NOT NULL,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT staff_statements_model_check CHECK (model IN ('hourly', 'daily'))
);
CREATE UNIQUE INDEX IF NOT EXISTS staff_statements_employee_period_uniq
  ON staff_statements(employee_id, period_year_month);

-- کوئری بررسی (read-only): SELECT count(*) FROM staff_statements;
-- Rollback: DROP TABLE IF EXISTS staff_statements;
