-- ═══════════════════════════════════════════════════════════════════
--  Migration: جدول واقعی سمت‌های شغلی (job_titles) — فاز ۵ یکپارچه‌سازی HR
--  فقط زیرساخت — این migration جایگزین payroll.roles (تنظیمات JSON) نمی‌کند
--  و ستون employees.role را تغییر نمی‌دهد. cutover واقعی یک تصمیم/برنامه‌ی
--  جداست که باید بعد از بررسی مقادیر فعلی و تأیید صریح مالک انجام شود.
--  Idempotent — اجرای چندباره امن است.
--  ⚠️ این فایل روی دیتابیس واقعی اجرا نشده.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS job_titles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  department text,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS job_titles_code_uniq ON job_titles(code) WHERE code IS NOT NULL;
CREATE INDEX IF NOT EXISTS job_titles_active_idx ON job_titles(is_active);

-- ─── seed — همان ۹ سمت پیش‌فرض فعلی (types/payroll.ts → DEFAULT_ROLES) ───
INSERT INTO job_titles (name, code) VALUES
  ('مدیر', 'manager'), ('سرآشپز', 'chef'), ('آشپز', 'cook'), ('گارسون', 'waiter'),
  ('صندوق‌دار', 'cashier'), ('ظرفشور', 'dishwasher'), ('پیک', 'delivery'),
  ('نظافتچی', 'cleaner'), ('سایر', 'other')
ON CONFLICT (code) WHERE code IS NOT NULL DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
--  قبل از هر تصمیم cutover (جایگزینی payroll.roles با این جدول)، این
--  کوئری را روی production بزنید تا سمت‌های سفارشی که کاربر از تنظیمات
--  اضافه کرده (که در این seed نیستند) شناسایی و به job_titles اضافه شوند:
--
--  SELECT role, COUNT(*) FROM employees GROUP BY role ORDER BY COUNT(*) DESC;
--
--  هر مقداری که در ستون بالا هست ولی در job_titles.code نیست را دستی اضافه کنید:
--  INSERT INTO job_titles (name, code) VALUES ('<برچسب>', '<مقدار role>')
--    ON CONFLICT (code) WHERE code IS NOT NULL DO NOTHING;
-- ═══════════════════════════════════════════════════════════════════

-- ─── تأیید ───
SELECT 'job_titles created' AS status;
SELECT COUNT(*) AS seeded_count FROM job_titles;

-- ═══════════════════════════════════════════════════════════════════
--  بازگشت (Rollback):
--  DROP TABLE IF EXISTS job_titles;
-- ═══════════════════════════════════════════════════════════════════
