-- ════════════════════════════════════════════════════════════════════
-- db-setup-flag-migration.sql
-- فاز ۵ — لنز عملیاتی/کامل
--
--   ① is_setup  روی جدول categories  — دسته‌های هزینه‌ی راه‌اندازی
--   ② opening_date روی جدول branches — تاریخ شروع بهره‌برداری
--
-- ترتیب اجرا در pgAdmin:
--   ۱. بخش A را اجرا کنید (SELECT — تأیید داده)
--   ۲. اگر داده‌ها درست بودند، بخش B را اجرا کنید
--   ۳. بخش C را اجرا کنید تا نتیجه تأیید شود
-- ════════════════════════════════════════════════════════════════════


-- ════════════════════════════════════════════════════════════════════
-- بخش A — تأیید پیش‌نیاز (فقط SELECT)
-- ════════════════════════════════════════════════════════════════════

-- ① دسته‌بندی‌های موجود — نام Pre-opening یا معادل را یادداشت کنید:
SELECT id, name, type
FROM categories
ORDER BY type, name;
-- انتظار: لیست همه دسته‌ها — اگر نام «Pre-opening» با کاراکترهای دیگری
-- نوشته شده، در بخش B خط UPDATE را ویرایش کنید.

-- ② شعب موجود:
SELECT id, name, opened
FROM branches
ORDER BY name;
-- انتظار: لیست شعب با تاریخ افتتاح فعلی.
-- opening_date بعد از migration هنوز null خواهد بود؛
-- مقدار آن را بعداً از UI تنظیمات شعب وارد کنید.


-- ════════════════════════════════════════════════════════════════════
-- بخش B — migration اصلی
-- ════════════════════════════════════════════════════════════════════

-- ① اضافه کردن is_setup به categories (idempotent با IF NOT EXISTS):
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS is_setup boolean NOT NULL DEFAULT false;

-- ② اضافه کردن opening_date به branches:
ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS opening_date text;

-- ③ flag گذاشتن روی دسته‌ی Pre-opening
--    اگر نام دقیق فرق دارد، این خط را ویرایش کنید:
UPDATE categories
SET is_setup = true
WHERE name ILIKE '%pre%'
  AND (name ILIKE '%opening%' OR name ILIKE '%open%');

-- اگر نام دقیق چیز دیگری است مثلاً «راه‌اندازی»، به جای بالا این را اجرا کنید:
-- UPDATE categories SET is_setup = true WHERE name ILIKE '%راه%اندازی%';


-- ════════════════════════════════════════════════════════════════════
-- بخش C — تأیید نهایی (فقط SELECT)
-- ════════════════════════════════════════════════════════════════════

-- ① دسته‌ها با flag:
SELECT id, name, type, is_setup
FROM categories
ORDER BY type, name;
-- انتظار:
--   دسته «Pre-opening» با is_setup = true
--   بقیه دسته‌ها با is_setup = false

-- ② شعب با opening_date:
SELECT id, name, opened, opening_date
FROM branches
ORDER BY name;
-- انتظار: ستون opening_date اضافه شده (مقدار null — از UI وارد کنید)
