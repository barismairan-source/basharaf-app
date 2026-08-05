-- ═══════════════════════════════════════════════════════════════════
--  Migration: اتصال اختیاری پرسنل↔کاربر سیستم — فاز ۸ یکپارچه‌سازی HR
--  فقط یک ستون nullable + یک unique index — بدون ادغام جدول‌ها.
--  Idempotent — اجرای چندباره امن است.
--  ⚠️ این فایل روی دیتابیس واقعی اجرا نشده.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE employees ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS employees_user_id_uniq ON employees(user_id) WHERE user_id IS NOT NULL;

-- ─── تأیید ───
SELECT 'employees.user_id created' AS status;

-- ─── کوئری بررسی — کارمندانی که نام/تلفن‌شان با یک کاربر سیستم یکی است
--     (کاندید بالقوه برای اتصال دستی، صرفاً پیشنهاد — نه اتصال خودکار): ───
-- SELECT e.id AS employee_id, e.full_name, e.phone, u.id AS user_id, u.name, u.email
--   FROM employees e JOIN users u ON u.name = e.full_name
--   WHERE e.user_id IS NULL;

-- ═══════════════════════════════════════════════════════════════════
--  بازگشت (Rollback):
--  DROP INDEX IF EXISTS employees_user_id_uniq;
--  ALTER TABLE employees DROP COLUMN IF EXISTS user_id;
-- ═══════════════════════════════════════════════════════════════════
