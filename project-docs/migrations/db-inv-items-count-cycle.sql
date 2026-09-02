-- ═══════════════════════════════════════════════════════════════════
--  Migration: چرخه‌ی شمارش/سفارش اقلام انبار (روزانه/هفتگی)
--  دنبال‌کردن الگوی دو برگه‌ی کاغذی «سفارش روزانه» (تازه/حساس) و
--  «سفارش هفتگی» (ماندگار) که کاربر می‌فرستاد — هر قلم حالا مشخص می‌کند
--  باید هر روز شمرده شود یا هفته‌ای یک‌بار.
--  ستون NOT NULL با DEFAULT 'weekly' — یعنی همه‌ی اقلام قدیمی بدون نیاز
--  به backfill دستی «weekly» می‌شوند (اکثریت اقلام آشپزخانه ماندگارند)؛
--  فقط اقلام تازه/حساس باید دستی به «daily» تغییر کنند.
--  Idempotent — اجرای چندباره امن است. هیچ داده‌ای حذف نمی‌شود.
--  ⚠️ این فایل روی دیتابیس واقعی اجرا نشده — فقط برای اجرای دستی توسط
--     مدیر پروژه (pgAdmin/DBeaver) پس از تهیه‌ی backup آماده شده است.
-- ═══════════════════════════════════════════════════════════════════

DO $$ BEGIN CREATE TYPE inv_count_cycle AS ENUM ('daily','weekly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE inv_items ADD COLUMN IF NOT EXISTS count_cycle inv_count_cycle NOT NULL DEFAULT 'weekly';

-- ─── تأیید ───
SELECT 'inv_items.count_cycle column created' AS status;
SELECT count_cycle, COUNT(*) FROM inv_items GROUP BY count_cycle;

-- ─── پیشنهاد — لیست دسته‌های موجود، برای تصمیم دستی کدام‌ها daily شوند ───
-- SELECT category, COUNT(*) FROM inv_items WHERE is_active = true GROUP BY category ORDER BY category;
-- بعد از بررسی، مثلاً:
-- UPDATE inv_items SET count_cycle = 'daily' WHERE category IN ('ترهبار', 'گوشت و مرغ', 'لبنیات روزانه', 'نان و قنادی') AND is_active = true;

-- ═══════════════════════════════════════════════════════════════════
--  بازگشت (Rollback):
--  ALTER TABLE inv_items DROP COLUMN IF EXISTS count_cycle;
--  DROP TYPE IF EXISTS inv_count_cycle;
-- ═══════════════════════════════════════════════════════════════════
