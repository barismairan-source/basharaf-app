-- ═══════════════════════════════════════════════════════════════════
--  Seed: ۵ میز دقیق طبق مشخصات کاربر — الف/ب/پ/ت (اختصاصی) + ث (سوشیال).
--  فقط برای شعبی که از قبل ردیف reservation_settings دارند.
--  Idempotent — با WHERE NOT EXISTS روی (branch_id, name)، اجرای چندباره
--  ردیف تکراری نمی‌سازد. میزهای فعلیِ متفاوت (مثلاً از seed قدیمی‌تر) را
--  حذف نمی‌کند — اگر با این روزها هم‌پوشانی/تناقض دارند، خودتان از پنل
--  «میزها» حذفشان کنید.
--  ⚠️ این فایل روی دیتابیس واقعی اجرا نشده — فقط برای اجرای دستی توسط
--     مدیر پروژه (pgAdmin/DBeaver) آماده شده است.
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO tables (branch_id, name, capacity, is_social)
SELECT rs.branch_id, v.name, v.capacity, v.is_social
FROM reservation_settings rs
CROSS JOIN (VALUES
  ('الف', 6, false),
  ('ب',   4, false),
  ('پ',   4, false),
  ('ت',   3, false),
  ('ث',   7, true)
) AS v(name, capacity, is_social)
WHERE NOT EXISTS (
  SELECT 1 FROM tables t WHERE t.branch_id = rs.branch_id AND t.name = v.name
);

-- ─── تأیید ───
SELECT b.name AS branch_name, t.name AS table_name, t.capacity, t.is_social
FROM tables t JOIN branches b ON b.id = t.branch_id
ORDER BY b.name, t.name;

-- ═══════════════════════════════════════════════════════════════════
--  بازگشت (Rollback) — فقط اگر واقعاً لازم شد، و فقط همین ۵ نام دقیق:
--  DELETE FROM tables WHERE name IN ('الف', 'ب', 'پ', 'ت', 'ث');
-- ═══════════════════════════════════════════════════════════════════
