-- ═══════════════════════════════════════════════════════════════════
--  Migration: seed دو لینک «رزرو میز» و «سفارش آنلاین» روی basharaf.me/safasity
--  ⚠️ پیش‌نیاز: db-link-hub-reserve-order-kinds.sql باید قبلاً (در یک
--     اجرای جداگانه) روی این دیتابیس اجرا شده باشد.
--  هرکدام جدا و فقط اگر از قبل وجود نداشته باشد درج می‌شود — می‌توانید
--  بعداً از پنل (صفحه لینک) عنوان/نمایش/ترتیبشان را عوض کنید.
--  Idempotent — اجرای چندباره امن است. هیچ داده‌ای حذف نمی‌شود.
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO link_hub_items (kind, label, url, is_visible, sort_order)
SELECT 'reserve', 'رزرو میز', '/reserve', true, 5
WHERE NOT EXISTS (SELECT 1 FROM link_hub_items WHERE kind = 'reserve');

INSERT INTO link_hub_items (kind, label, url, is_visible, sort_order)
SELECT 'order', 'سفارش آنلاین', '/order', true, 6
WHERE NOT EXISTS (SELECT 1 FROM link_hub_items WHERE kind = 'order');

-- ─── تأیید ───
SELECT kind, label, url, is_visible, sort_order FROM link_hub_items ORDER BY sort_order;
