-- ═══════════════════════════════════════════════════════════════════
--  Migration: فصل‌های منو (menu_seasons) — تب «فصل و روتیشن» در پنل منو
--  یک جدول ساده برای یادداشت/تاریخچه‌ی فصل جاری منو (تابستان ۱۴۰۴،
--  پاییز ۱۴۰۵، …). به آیتم‌ها/دسته‌ها وصل نیست و روی نمایش عمومی منو
--  هیچ اثری ندارد — فقط برای مدیریت داخلی.
--  Idempotent — اجرای چندباره امن است. هیچ داده‌ی موجودی دست‌خورده نمی‌شود.
--  ⚠️ این فایل روی دیتابیس واقعی اجرا نشده — فقط برای اجرای دستی توسط
--     مدیر پروژه (pgAdmin/DBeaver) پس از تهیه‌ی backup آماده شده است.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS menu_seasons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_fa     TEXT NOT NULL,
  name_en     TEXT,
  note        TEXT,
  is_current  BOOLEAN NOT NULL DEFAULT false,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- فقط یک فصل هم‌زمان می‌تواند «جاری» باشد.
CREATE UNIQUE INDEX IF NOT EXISTS menu_seasons_current_uniq ON menu_seasons(is_current) WHERE is_current = true;

-- ─── تأیید ───
SELECT 'menu_seasons table ready' AS status;
SELECT count(*) FROM menu_seasons;

-- ═══════════════════════════════════════════════════════════════════
--  بازگشت (Rollback):
--  DROP TABLE IF EXISTS menu_seasons;
-- ═══════════════════════════════════════════════════════════════════
