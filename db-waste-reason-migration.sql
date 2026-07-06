-- Migration: waste_reason on inv_voucher_lines
-- هدف: افزودن ستون دلیل ضایعات به خطوط برگه — اختیاری، فقط برای kind='waste'
-- سازگاری عقب‌رو: برگه‌های قدیمی بدون دلیل NULL می‌شوند (در UI: «بدون دلیل ثبت‌شده»)
--
-- Idempotent: ADD COLUMN IF NOT EXISTS — اجرای مجدد مشکل ایجاد نمی‌کند.
-- این فایل را یک‌بار در pgAdmin روی دیتابیس production اجرا کنید، سپس deploy کنید.

ALTER TABLE inv_voucher_lines ADD COLUMN IF NOT EXISTS waste_reason text;
