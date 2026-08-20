-- ═══════════════════════════════════════════════════════════════════
--  Seed: ۵ میز واقعی طبق مشخصات کاربر — به‌جای ساخت دستی از پنل.
--  فقط برای شعبی که از قبل ردیف reservation_settings دارند (یعنی رزرو
--  آنلاین برایشان تنظیم شده) — روی هر شعبه‌ی جدید که بعداً reservation_
--  settings بگیرد هم با اجرای دوباره‌ی همین فایل خودکار اعمال می‌شود.
--  Idempotent — با WHERE NOT EXISTS روی (branch_id, name)، اجرای چندباره
--  ردیف تکراری نمی‌سازد.
--  ⚠️ این فایل روی دیتابیس واقعی اجرا نشده — فقط برای اجرای دستی توسط
--     مدیر پروژه (pgAdmin/DBeaver) آماده شده است.
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO tables (branch_id, name, capacity, is_social)
SELECT rs.branch_id, v.name, v.capacity, v.is_social
FROM reservation_settings rs
CROSS JOIN (VALUES
  ('میز ۱ (۱،۲)',            6, false),
  ('میز ۲ (۳،۴) - سوشیال',   7, true),
  ('میز ۳ (۵)',              2, false),
  ('میز ۴ (۶)',              5, false),
  ('میز ۵ (۷)',              5, false)
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
--  DELETE FROM tables WHERE name IN (
--    'میز ۱ (۱،۲)', 'میز ۲ (۳،۴) - سوشیال', 'میز ۳ (۵)', 'میز ۴ (۶)', 'میز ۵ (۷)'
--  );
-- ═══════════════════════════════════════════════════════════════════
