-- db-user-roles-migration.sql
-- افزودن نقش‌های Warehouse (انباردار) و Chef (سرآشپز) به enum user_role
--
-- چرا لازم است: enum پایه‌ی user_role فقط ('SuperAdmin', 'BranchUser') بود
-- (drizzle/migrations/0000_tranquil_viper.sql). دو نقش Warehouse و Chef در
-- schema.ts (سطح TypeScript) تعریف شده‌اند اما هرگز به enum واقعی دیتابیس
-- اضافه نشدند. بدون این migration، ساخت کاربر با نقش Chef/Warehouse با خطای
-- «invalid input value for enum user_role» شکست می‌خورد (۵۰۰ خطای داخلی سرور).
--
-- ⚠️⚠️ مهم — اجرا خارج از transaction:
-- دستور «ALTER TYPE ... ADD VALUE» در PostgreSQL transactional نیست و
-- نمی‌تواند داخل یک transaction block اجرا شود. در pgAdmin هر دستور را
-- جداگانه و با auto-commit روشن اجرا کنید (دقیقاً مثل db-accounting-v1-migration.sql).
-- IF NOT EXISTS تضمین می‌کند اجرای دوباره بی‌ضرر است (idempotent).

-- ===== ۱. افزودن 'Warehouse' (انباردار) =====
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Warehouse';

-- ===== ۲. افزودن 'Chef' (سرآشپز) =====
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Chef';

-- بررسی (اختیاری): مقادیر فعلی enum
-- SELECT enumlabel FROM pg_enum
--   JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
--   WHERE pg_type.typname = 'user_role' ORDER BY enumsortorder;
