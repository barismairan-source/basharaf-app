-- ═══════════════════════════════════════════════════════════════════
--  Migration: تاریخچه‌ی واریزی‌های پرسنل (برای پنل پرسنل /me و صفحه‌ی «پرسنل و حقوق»)
--  فقط ۱ جدول جدید — هیچ جدول یا ستون موجودی تغییر نمی‌کند؛ به transactions/accounts/payslips ربطی ندارد
--  (موجودی حساب‌ها عوض نمی‌شود). شماره‌ی شبا ذخیره نمی‌شود.
--  Idempotent — اجرای چندباره امن است.
--  ترتیب انتشار: اول همین فایل، بعد کد (کد جدید این جدول را می‌خواند).
--  شرح: project-docs/STAFF-PANEL.md
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS staff_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  period_year_month text NOT NULL,          -- ماهی که پول بابت آن است، مثل 1405-07
  kind text NOT NULL,                       -- salary | overtime | advance | other
  amount bigint NOT NULL,                   -- تومان
  paid_on text,                             -- تاریخ واریز جلالی YYYY/MM/DD
  title text NOT NULL,                      -- شرح کوتاه برای نمایش
  has_receipt boolean NOT NULL DEFAULT false,
  source text,                              -- نام فایل رسید/لیست بانک
  source_key text NOT NULL,                 -- کلید یکتای ردیف منبع (اجرای دوباره = به‌روزرسانی، نه تکرار)
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT staff_payments_kind_check CHECK (kind IN ('salary', 'overtime', 'advance', 'other')),
  CONSTRAINT staff_payments_amount_check CHECK (amount > 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS staff_payments_source_key_uniq ON staff_payments(source_key);
CREATE INDEX IF NOT EXISTS staff_payments_employee_idx ON staff_payments(employee_id, period_year_month);

-- کوئری بررسی (read-only): SELECT count(*), sum(amount) FROM staff_payments;
-- Rollback: DROP TABLE IF EXISTS staff_payments;
