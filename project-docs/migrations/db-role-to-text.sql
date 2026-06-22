-- ═══════════════════════════════════════════════════════════════════
--  Migration: تبدیل ستون employees.role از enum به text
--  تا سمت‌های سفارشی (از تنظیمات) قابل ذخیره باشند.
--  کم‌ریسک: مقادیر فعلی همه string معتبرند. idempotent.
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
  -- فقط اگر هنوز enum است تبدیل کن
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'role'
      AND udt_name = 'employee_role'
  ) THEN
    ALTER TABLE employees ALTER COLUMN role DROP DEFAULT;
    ALTER TABLE employees ALTER COLUMN role TYPE text USING role::text;
    ALTER TABLE employees ALTER COLUMN role SET DEFAULT 'other';
  END IF;
END $$;

-- enum employee_role باقی می‌ماند (بی‌ضرر، شاید جای دیگر استفاده شود)
SELECT 'role column is now: ' || data_type AS status
  FROM information_schema.columns
  WHERE table_name='employees' AND column_name='role';
