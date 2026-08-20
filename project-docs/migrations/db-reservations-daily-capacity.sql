-- ═══════════════════════════════════════════════════════════════════
--  Migration: ساده‌سازی رزرو عمومی به «فقط امروز» + ظرفیت بر اساس تعداد میز
--  بعد از db-reservations-public-booking.sql — طبق بازخورد کاربر بعد از
--  اولین دیپلوی: مدل اسلات‌زمانی/روزهای آینده حذف شد، به‌جایش یک کلید
--  روزانه‌ی روشن/خاموش + سقف تعداد میز + متن/شماره‌ی دلخواه برای حالت بسته.
--  فقط ستون‌های اضافه (nullable/با پیش‌فرض) — چیزی حذف/تغییر نمی‌شود.
--  ستون‌های قدیمی (working_days, open_time, close_time, slot_minutes,
--  slot_capacity_guests, min_lead_minutes, max_lead_days, blackout_dates)
--  دیگر توسط اپلیکیشن خوانده نمی‌شوند ولی عمداً حذف نشده‌اند — بی‌ضررند.
--  Idempotent — اجرای چندباره امن است.
--  ⚠️ این فایل روی دیتابیس واقعی اجرا نشده — فقط برای اجرای دستی توسط
--     مدیر پروژه (pgAdmin) پس از تهیه‌ی backup آماده شده است.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE reservation_settings ADD COLUMN IF NOT EXISTS table_count integer NOT NULL DEFAULT 5;
ALTER TABLE reservation_settings ADD COLUMN IF NOT EXISTS closed_message text;
ALTER TABLE reservation_settings ADD COLUMN IF NOT EXISTS closed_phone text;

-- ─── تأیید ───
SELECT 'reservation_settings daily-capacity columns created' AS status;
SELECT branch_id, is_public_enabled, table_count, closed_message, closed_phone FROM reservation_settings;

-- ─── کوئری بررسی ───
-- شعبی که از قبل رزرو عمومی را تنظیم کرده‌اند و باید closed_message/closed_phone
-- را هم پر کنند (فعلاً خالی است، پیش‌فرض ستون NULL است):
-- SELECT b.name, rs.table_count, rs.closed_message, rs.closed_phone
--   FROM reservation_settings rs JOIN branches b ON b.id = rs.branch_id
--   WHERE rs.closed_message IS NULL;

-- ═══════════════════════════════════════════════════════════════════
--  بازگشت (Rollback):
--  ALTER TABLE reservation_settings DROP COLUMN IF EXISTS table_count;
--  ALTER TABLE reservation_settings DROP COLUMN IF EXISTS closed_message;
--  ALTER TABLE reservation_settings DROP COLUMN IF EXISTS closed_phone;
-- ═══════════════════════════════════════════════════════════════════
