-- ═══════════════════════════════════════════════════════════════════
--  Migration: اتصال واقعی استخدام↔پرسنل — فاز ۷ یکپارچه‌سازی HR
--  فقط ستون‌های اضافه (nullable) — بدون تغییر enum، بدون حذف داده.
--  Idempotent — اجرای چندباره امن است.
--  ⚠️ این فایل روی دیتابیس واقعی اجرا نشده.
-- ═══════════════════════════════════════════════════════════════════

-- ─── ردیابی زمان/کاربر استخدام روی خودِ متقاضی ───
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS hired_at timestamptz;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS hired_by uuid REFERENCES users(id) ON DELETE SET NULL;

-- ─── اتصال یک‌به‌یک از پرسنل به متقاضی مبدأ (nullable, یکتا) ───
ALTER TABLE employees ADD COLUMN IF NOT EXISTS source_application_id uuid REFERENCES job_applications(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS employees_source_application_uniq ON employees(source_application_id) WHERE source_application_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════
--  تصمیم مهم: مقدار enum جدید 'hired' به application_status اضافه نشد.
--  «استخدام واقعی» = hired_at IS NOT NULL (نه یک مقدار status جدید) —
--  چون گسترش enum نیازمند تغییر همزمان کل UI کانبان استخدام (تب‌ها/
--  شمارش‌ها/رنگ‌ها) بود و ریسک/گستره‌ی غیرضروری اضافه می‌کرد. اگر بعداً
--  خواستید مقدار 'hired' واقعی اضافه شود، این دستور (خارج از تراکنش،
--  idempotent با IF NOT EXISTS) کافی است:
--    ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'offer';
--    ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'hired';
-- ═══════════════════════════════════════════════════════════════════

-- ─── تأیید ───
SELECT 'recruitment-employee link columns created' AS status;

-- ─── کوئری‌های بررسی ───
-- قبل: چند کارمند موجود از قبل با شماره‌ی تلفن یک متقاضی مطابقت دارند
-- (این‌ها از رفتار قدیمی PATCH /api/recruitment/[id] ساخته شده‌اند و
-- source_application_id ندارند — تصمیم با شماست که دستی وصل‌شان کنید یا نه):
-- SELECT e.id AS employee_id, e.full_name, e.phone, ja.id AS application_id, ja.first_name, ja.last_name
--   FROM employees e JOIN job_applications ja ON ja.phone = e.phone
--   WHERE e.source_application_id IS NULL;
--
-- بعد: تعداد اتصال‌های واقعی جدید:
-- SELECT COUNT(*) FROM employees WHERE source_application_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════
--  بازگشت (Rollback):
--  DROP INDEX IF EXISTS employees_source_application_uniq;
--  ALTER TABLE employees DROP COLUMN IF EXISTS source_application_id;
--  ALTER TABLE job_applications DROP COLUMN IF EXISTS hired_by;
--  ALTER TABLE job_applications DROP COLUMN IF EXISTS hired_at;
-- ═══════════════════════════════════════════════════════════════════
