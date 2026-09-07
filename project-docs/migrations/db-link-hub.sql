-- ═══════════════════════════════════════════════════════════════════
--  Migration: صفحه‌ی لینک basharaf.me/safasity (سبک Linktree/Bento)
--  دو جدول جدید: link_hub_items (لیست لینک‌ها — منو، استخدام،
--  اینستاگرام، تماس، و لینک‌های سفارشی که از پنل قابل افزودن/حذف‌اند)
--  و link_hub_settings (تنظیمات تک‌ردیفی صفحه: عنوان، توضیح، آدرس،
--  لینک نقشه، نمایش کد QR).
--  ردیف‌های پیش‌فرض (منو/استخدام/اینستاگرام/تماس) با مقادیر واقعی که
--  کاربر داده seed می‌شوند؛ اگر از قبل اجرا شده باشد دوباره درج نمی‌کند.
--  Idempotent — اجرای چندباره امن است. هیچ داده‌ای حذف نمی‌شود.
--  ⚠️ این فایل روی دیتابیس واقعی اجرا نشده — فقط برای اجرای دستی توسط
--     مدیر پروژه (pgAdmin/DBeaver) پس از تهیه‌ی backup آماده شده است.
-- ═══════════════════════════════════════════════════════════════════

DO $$ BEGIN CREATE TYPE link_hub_item_kind AS ENUM ('menu','apply','instagram','phone','custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS link_hub_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind         link_hub_item_kind NOT NULL DEFAULT 'custom',
  label        TEXT NOT NULL,
  url          TEXT NOT NULL,
  is_visible   BOOLEAN NOT NULL DEFAULT true,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS link_hub_settings (
  id           INTEGER PRIMARY KEY DEFAULT 1,
  title        TEXT NOT NULL DEFAULT '',
  bio          TEXT NOT NULL DEFAULT '',
  address_fa   TEXT NOT NULL DEFAULT '',
  map_url      TEXT,
  show_qr      BOOLEAN NOT NULL DEFAULT true,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── تنظیمات تک‌ردیفی — عنوان و آدرس واقعی صفاسیتی ───
INSERT INTO link_hub_settings (id, title, bio, address_fa, map_url, show_qr)
VALUES (1, 'صفاسیتی', '', 'مجتمع تجاری ASP، پلاک ۱۰', NULL, true)
ON CONFLICT (id) DO NOTHING;

-- ─── لینک‌های پیش‌فرض — فقط اگر جدول کاملاً خالی است (اجرای اول) ───
INSERT INTO link_hub_items (kind, label, url, is_visible, sort_order)
SELECT * FROM (VALUES
  ('menu'::link_hub_item_kind,      'منو دیجیتال',        '/safasity/menu',                       true, 1),
  ('apply'::link_hub_item_kind,     'همکاری با ما',        '/apply',                               true, 2),
  ('instagram'::link_hub_item_kind, 'اینستاگرام',          'https://instagram.com/safasity.bistro', true, 3),
  ('phone'::link_hub_item_kind,     'تماس با رستوران',     'tel:02188603988',                      true, 4)
) AS seed(kind, label, url, is_visible, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM link_hub_items);

-- ─── تأیید ───
SELECT 'link_hub tables ready' AS status;
SELECT * FROM link_hub_settings;
SELECT kind, label, url, is_visible, sort_order FROM link_hub_items ORDER BY sort_order;

-- ═══════════════════════════════════════════════════════════════════
--  بازگشت (Rollback):
--  DROP TABLE IF EXISTS link_hub_items;
--  DROP TABLE IF EXISTS link_hub_settings;
--  DROP TYPE IF EXISTS link_hub_item_kind;
-- ═══════════════════════════════════════════════════════════════════
