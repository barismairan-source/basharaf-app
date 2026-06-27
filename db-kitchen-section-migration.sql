-- Migration: kitchen section — protective backfill (Phase 1)
-- جداسازی انبار/آشپزخانه — فاز ۱ (مهاجرت محافظتی)
--
-- هدف: هر کاربری که الان permission صریح 'inventory' دارد، 'kitchen' هم بگیرد،
-- تا وقتی فاز ۲ تفکیک بخش‌ها را روشن کرد، دسترسی فعلی‌اش به «دستور پخت/برنامه تولید»
-- از دست نرود.
--
-- ستون users.permissions از نوع JSONB است (آرایه‌ی string یا NULL).
--   - کاربران با permissions = NULL یا [] → دست‌نخورده (پیش‌فرض نقش، migration لازم ندارند).
--   - کاربران با آرایه‌ی صریح شامل 'inventory' و بدون 'kitchen' → 'kitchen' افزوده می‌شود.
--
-- Idempotent: شرط NOT (... @> '"kitchen"') تضمین می‌کند اجرای دوباره چیزی را دوبار اضافه نکند.
-- این فایل را یک‌بار در pgAdmin روی دیتابیس production اجرا کنید.

UPDATE users
SET permissions = permissions || '["kitchen"]'::jsonb
WHERE permissions @> '"inventory"'::jsonb
  AND NOT (permissions @> '"kitchen"'::jsonb);

-- بررسی (اختیاری): کاربرانی که حالا kitchen دارند
-- SELECT id, name, permissions FROM users WHERE permissions @> '"kitchen"'::jsonb;
