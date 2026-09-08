-- ═══════════════════════════════════════════════════════════════════
--  Migration: انتخاب فونت انگلیسی منو (فعلاً Gochi Hand هاردکد بود)
--  ستون جدید menu_settings.en_font — دقیقاً مثل fa_font، از پنل
--  تنظیمات منو قابل تغییر است. اضافه شد چون فونت‌های دست‌خطی (Gochi
--  Hand، Patrick Hand SC) x-height کوچکی دارند و در همان اندازه‌ی فونت
--  فارسی ریزتر دیده می‌شوند — کد سمت کامپوننت این را جبران می‌کند.
--  Idempotent — اجرای چندباره امن است. هیچ داده‌ای حذف نمی‌شود.
--  ⚠️ این فایل روی دیتابیس واقعی اجرا نشده — فقط برای اجرای دستی توسط
--     مدیر پروژه (pgAdmin/DBeaver) پس از تهیه‌ی backup آماده شده است.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE menu_settings ADD COLUMN IF NOT EXISTS en_font TEXT NOT NULL DEFAULT 'GochiHand';

-- ─── تأیید ───
SELECT 'menu_settings.en_font column created' AS status;
SELECT id, fa_font, en_font FROM menu_settings;

-- ═══════════════════════════════════════════════════════════════════
--  بازگشت (Rollback):
--  ALTER TABLE menu_settings DROP COLUMN IF EXISTS en_font;
-- ═══════════════════════════════════════════════════════════════════
