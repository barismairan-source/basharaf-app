-- ═══════════════════════════════════════════════════════════════════
--  Migration: افزودن دو نوع لینک جدید به صفحه‌ی basharaf.me/safasity
--  «رزرو میز» (/reserve) و «سفارش آنلاین» (/order) — هر دو سیستم از قبل
--  در برنامه ساخته شده بودند، فقط روی صفحه‌ی لینک نبودند.
--  این فایل فقط enum را گسترش می‌دهد. ردیف‌های واقعی در فایل دوم
--  (db-link-hub-reserve-order-seed.sql) درج می‌شوند.
--  ⚠️ حتماً این فایل را جدا و قبل از فایل seed اجرا کنید — PostgreSQL
--     اجازه نمی‌دهد مقدار enum تازه‌اضافه‌شده در همان تراکنش استفاده شود.
--  Idempotent — اجرای چندباره امن است.
-- ═══════════════════════════════════════════════════════════════════

ALTER TYPE link_hub_item_kind ADD VALUE IF NOT EXISTS 'reserve';
ALTER TYPE link_hub_item_kind ADD VALUE IF NOT EXISTS 'order';

-- ─── تأیید ───
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'link_hub_item_kind'::regtype ORDER BY enumsortorder;
