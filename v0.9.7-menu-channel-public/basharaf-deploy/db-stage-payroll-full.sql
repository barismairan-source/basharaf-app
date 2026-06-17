-- ═══════════════════════════════════════════════════════════════════
--  basharaf — SQL مرحله‌ی حقوق و دستمزد (یکجا)
--  روی دیتابیس postgres در Liara اجرا کنید. کاملاً idempotent.
--
--  شامل:
--    بخش ۱: جدول system_logs (اگر هنوز ساخته نشده)
--    بخش ۲: اطمینان از ستون categories.type
--    بخش ۳: کل ماژول حقوق (۸ enum + ۷ جدول + seed ۱۴۰۵)
--
--  هیچ‌کدام از ۱۳ جدول هسته را تغییر نمی‌دهد یا بازنمی‌سازد.
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- بخش ۱: system_logs (سیستم لاگ)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level        TEXT NOT NULL DEFAULT 'info',
  category     TEXT NOT NULL DEFAULT 'general',
  message      TEXT NOT NULL,
  path         TEXT, method TEXT, status_code INTEGER,
  user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email   TEXT, context TEXT, stack TEXT, ip TEXT, user_agent TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS logs_level_idx    ON system_logs(level);
CREATE INDEX IF NOT EXISTS logs_category_idx ON system_logs(category);
CREATE INDEX IF NOT EXISTS logs_created_idx  ON system_logs(created_at DESC);

-- ───────────────────────────────────────────────────────────────────
-- بخش ۲: اطمینان از ستون categories.type (رفع باگ قبلی)
-- ───────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='categories' AND column_name='kind') THEN
    ALTER TABLE categories RENAME COLUMN kind TO type;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- بخش ۳: ماژول حقوق و دستمزد
-- ═══════════════════════════════════════════════════════════════════

-- ─── enumها (۸ عدد) ───
DO $$ BEGIN CREATE TYPE employee_role AS ENUM
  ('manager','chef','cook','waiter','cashier','dishwasher','delivery','cleaner','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE payroll_event_type AS ENUM
  ('advance','deduction','bonus','settlement');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE gender AS ENUM ('male','female','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE marital_status AS ENUM ('single','married','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE insurance_status AS ENUM ('insured','uninsured','pending','exempt');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE document_type AS ENUM
  ('national_id_card','birth_certificate','health_card','contract','insurance_doc','education','photo','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE payroll_run_status AS ENUM ('draft','calculated','approved','posted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE journal_voucher_status AS ENUM ('built','posted','reversed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── employees (با FK به branches هسته) ───
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  national_id text,
  phone text NOT NULL,
  role employee_role NOT NULL DEFAULT 'other',
  branch_id uuid REFERENCES branches(id) ON DELETE RESTRICT,
  branch_name text,
  father_name text,
  birth_date date,
  gender gender,
  marital_status marital_status,
  address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  iban text,
  bank_account text,
  insurance_status insurance_status NOT NULL DEFAULT 'uninsured',
  insurance_number text,
  insurance_start_date date,
  health_card_number text,
  health_card_issue_date date,
  health_card_expiry_date date,
  join_date date NOT NULL,
  termination_date date,
  base_monthly_salary bigint NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS employees_national_id_uniq ON employees(national_id) WHERE national_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS employees_active_idx ON employees(is_active);
CREATE INDEX IF NOT EXISTS employees_full_name_idx ON employees(full_name);
CREATE INDEX IF NOT EXISTS employees_branch_idx ON employees(branch_id);

-- ─── employee_documents (FK به employees + users هسته) ───
CREATE TABLE IF NOT EXISTS employee_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type document_type NOT NULL,
  title text NOT NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  file_size bigint,
  expiry_date date,
  uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS employee_documents_employee_idx ON employee_documents(employee_id);
CREATE INDEX IF NOT EXISTS employee_documents_type_idx ON employee_documents(type);

-- ─── payroll_events (FK به employees + users هسته) ───
CREATE TABLE IF NOT EXISTS payroll_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  type payroll_event_type NOT NULL,
  amount bigint NOT NULL,
  period_year_month text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  description text,
  settlement_method text,
  settled_amount bigint,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  voided_at timestamptz,
  void_reason text
);
CREATE INDEX IF NOT EXISTS payroll_events_employee_period_idx ON payroll_events(employee_id, period_year_month);
CREATE INDEX IF NOT EXISTS payroll_events_period_idx ON payroll_events(period_year_month);
CREATE INDEX IF NOT EXISTS payroll_events_type_idx ON payroll_events(type);
CREATE UNIQUE INDEX IF NOT EXISTS payroll_events_one_active_settlement_per_month
  ON payroll_events(employee_id, period_year_month)
  WHERE voided_at IS NULL AND type = 'settlement';

-- ─── payroll_parameters ───
CREATE TABLE IF NOT EXISTS payroll_parameters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jalali_year integer NOT NULL UNIQUE,
  min_daily_wage bigint NOT NULL,
  min_monthly_wage bigint NOT NULL,
  housing_allowance bigint NOT NULL,
  grocery_allowance bigint NOT NULL,
  marriage_allowance bigint NOT NULL,
  seniority_daily bigint NOT NULL,
  child_allowance_per bigint NOT NULL,
  tax_exempt_monthly bigint NOT NULL,
  tax_brackets jsonb NOT NULL,
  insurance_employee_rate numeric(5,4) NOT NULL,
  insurance_employer_rate numeric(5,4) NOT NULL,
  overtime_multiplier numeric(4,2) NOT NULL,
  night_shift_premium numeric(4,2) NOT NULL,
  holiday_multiplier numeric(4,2) NOT NULL,
  child_min_insurance_days integer NOT NULL DEFAULT 720,
  standard_monthly_hours numeric(6,2) NOT NULL DEFAULT 192,
  effective_from date,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── payroll_runs (FK به branches + users + parameters) ───
CREATE TABLE IF NOT EXISTS payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES branches(id) ON DELETE RESTRICT,
  branch_name text,
  period_year_month text NOT NULL,
  parameters_id uuid NOT NULL REFERENCES payroll_parameters(id),
  status payroll_run_status NOT NULL DEFAULT 'draft',
  calculated_at timestamptz,
  approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  posted_to_basharaf_at timestamptz,
  journal_voucher_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS payroll_runs_branch_period_uniq ON payroll_runs(branch_id, period_year_month);
CREATE INDEX IF NOT EXISTS payroll_runs_period_idx ON payroll_runs(period_year_month);

-- ─── payslips (FK به payroll_runs + employees) ───
CREATE TABLE IF NOT EXISTS payslips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id uuid NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  period_year_month text NOT NULL,
  worked_days numeric(5,2) NOT NULL,
  gross_earnings bigint NOT NULL,
  taxable_base bigint NOT NULL,
  insurance_base bigint NOT NULL,
  insurance_employee bigint NOT NULL,
  insurance_employer bigint NOT NULL,
  income_tax bigint NOT NULL,
  total_deductions bigint NOT NULL,
  net_pay bigint NOT NULL,
  calc_snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payslips_run_idx ON payslips(payroll_run_id);
CREATE INDEX IF NOT EXISTS payslips_employee_period_idx ON payslips(employee_id, period_year_month);

-- ─── journal_vouchers (FK به payroll_runs + branches هسته) ───
CREATE TABLE IF NOT EXISTS journal_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id uuid NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  period text NOT NULL,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  lines jsonb NOT NULL,
  total_debit bigint NOT NULL,
  total_credit bigint NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  basharaf_voucher_id text,
  status journal_voucher_status NOT NULL DEFAULT 'built',
  posted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Seed: پارامترهای سال ۱۴۰۵ (تومان) ───
-- ⚠️ قبل از تولید با آخرین بخشنامه سازمان امور مالیاتی/تأمین اجتماعی تطبیق دهید
INSERT INTO payroll_parameters (
  jalali_year, min_daily_wage, min_monthly_wage,
  housing_allowance, grocery_allowance, marriage_allowance,
  seniority_daily, child_allowance_per, tax_exempt_monthly,
  tax_brackets, insurance_employee_rate, insurance_employer_rate,
  overtime_multiplier, night_shift_premium, holiday_multiplier,
  child_min_insurance_days, standard_monthly_hours, effective_from
) VALUES (
  1405, 554185, 16625550, 3000000, 2200000, 500000,
  16667, 1662555, 4000000,
  '[{"upToMonthly":4000000,"rate":0},{"upToMonthly":14000000,"rate":0.10},{"upToMonthly":24000000,"rate":0.15},{"upToMonthly":36000000,"rate":0.20},{"upToMonthly":null,"rate":0.30}]'::jsonb,
  0.07, 0.23, 1.40, 0.35, 1.40, 720, 192, DATE '2026-03-21'
) ON CONFLICT (jalali_year) DO NOTHING;

-- تأیید
SELECT 'payroll tables created' AS status;
SELECT table_name FROM information_schema.tables
  WHERE table_name IN ('employees','employee_documents','payroll_events','payroll_parameters','payroll_runs','payslips','journal_vouchers')
  ORDER BY table_name;
