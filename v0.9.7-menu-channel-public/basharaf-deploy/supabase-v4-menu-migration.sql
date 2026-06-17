-- ═══════════════════════════════════════════════════════════════
-- Migration نسخه ۰.۵ — ماژول منوی دیجیتال صفاسیتی
-- در Supabase SQL Editor اجرا کنید
-- ═══════════════════════════════════════════════════════════════
-- نکته: قیمت‌ها BIGINT هستند (هماهنگ با بقیه سیستم - تومان صحیح)
-- نکته: RLS غیرفعال - این سیستم از JWT خودش استفاده می‌کند

-- ۱. updated_at trigger
CREATE OR REPLACE FUNCTION public.set_menu_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ۲. menu_categories
CREATE TABLE IF NOT EXISTS menu_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL UNIQUE,
  label_en    TEXT NOT NULL,
  label_fa    TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ۳. menu_items
CREATE TABLE IF NOT EXISTS menu_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id     UUID NOT NULL REFERENCES menu_categories(id) ON DELETE RESTRICT,
  title_en        TEXT NOT NULL,
  title_fa        TEXT NOT NULL,
  description_en  TEXT NOT NULL DEFAULT '',
  description_fa  TEXT NOT NULL DEFAULT '',
  price           BIGINT NOT NULL DEFAULT 0,
  is_available    BOOLEAN NOT NULL DEFAULT true,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_sort ON menu_items(category_id, sort_order);

DROP TRIGGER IF EXISTS trg_menu_items_updated ON menu_items;
CREATE TRIGGER trg_menu_items_updated
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION public.set_menu_updated_at();

-- ۴. menu_settings (تک‌ردیفی)
CREATE TABLE IF NOT EXISTS menu_settings (
  id          INTEGER PRIMARY KEY DEFAULT 1,
  fa_font     TEXT NOT NULL DEFAULT 'IRANMarker',
  phone       TEXT NOT NULL DEFAULT '',
  address_fa  TEXT NOT NULL DEFAULT '',
  address_en  TEXT NOT NULL DEFAULT '',
  instagram   TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);
INSERT INTO menu_settings (id, fa_font) VALUES (1, 'IRANMarker')
ON CONFLICT (id) DO NOTHING;

-- ۵. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE menu_items;
ALTER PUBLICATION supabase_realtime ADD TABLE menu_categories;

-- ۶. Seed دسته‌ها
INSERT INTO menu_categories (slug, label_en, label_fa, sort_order) VALUES
  ('appetizers', 'Appetizers',  'پیش‌غذا',   10),
  ('mains',      'Main Course', 'غذای اصلی', 20),
  ('desserts',   'Desserts',    'دسر',       30)
ON CONFLICT (slug) DO NOTHING;

-- ۷. Seed آیتم‌ها — پیش‌غذا
WITH cat AS (SELECT id FROM menu_categories WHERE slug = 'appetizers')
INSERT INTO menu_items (category_id, title_en, title_fa, description_en, description_fa, price, is_available, sort_order)
SELECT (SELECT id FROM cat), * FROM (VALUES
  ('Spinach & Leek Soup', 'سوپ اسفناج و تره‌فرنگی', 'With cream and croutons', 'با خامه و کروتان', 300::bigint, true, 10),
  ('Little Gem Salad', 'سالاد لیتل جم', 'Vegetable vinaigrette, walnut, cranberry', 'با وینگرت سبزیجات، گردو و کرن‌بری', 400, true, 20),
  ('Parmesan Fries — House Mayo', 'پارمژان فرایز — مایو خانگی', 'With handmade mayonnaise', 'با مایونز دست‌ساز', 300, true, 30),
  ('Parmesan Fries — Truffle Mayo', 'پارمژان فرایز — مایو ترافل', 'With truffle mayo', 'با مایو ترافل', 300, true, 40),
  ('Classic Caesar', 'سزار کلاسیک', '', '', 450, true, 50),
  ('Wings — Buffalo', 'وینگز بوفالو', 'Chicken wings with buffalo sauce', 'بال مرغ با سس بوفالو، در حد تست', 400, true, 60),
  ('Wings — Orange', 'وینگز پرتقالی', 'Chicken wings with orange sauce', 'بال مرغ با سس پرتقال، در حد تست', 400, true, 70),
  ('Wings — Korean', 'وینگز کره‌ای', 'Chicken wings, Korean sauce', 'بال مرغ با سس کره‌ای، در حد تست', 400, true, 80),
  ('Nachos', 'ناچو', 'With beet & orange salad, labneh, pomegranate', 'با سالاد لبو و پرتقال، لبنه و انار', 400, true, 90),
  ('Mac & Cheese with Crispy Bacon', 'مک اند چیز با بیکن کریسپی', '', '', 400, true, 100)
) AS t(title_en, title_fa, description_en, description_fa, price, is_available, sort_order)
ON CONFLICT DO NOTHING;

-- غذای اصلی
WITH cat AS (SELECT id FROM menu_categories WHERE slug = 'mains')
INSERT INTO menu_items (category_id, title_en, title_fa, description_en, description_fa, price, is_available, sort_order)
SELECT (SELECT id FROM cat), * FROM (VALUES
  ('Meatball Sandwich — Marinara', 'ساندویچ میت‌بال — مارینارا', '', '', 600::bigint, true, 10),
  ('Meatball Sandwich — Tomato Cream', 'ساندویچ میت‌بال — توماتو خامه', '', '', 600, true, 20),
  ('Meatball Sandwich — Peppercorn', 'ساندویچ میت‌بال — پپرکورن', '', '', 600, true, 30),
  ('Hot Dog — Pickle & Kraut', 'هات‌داگ — پیکل و ساورکراوت', 'House hot dog, home pickle, sauerkraut', 'هات‌داگ دست‌ساز با پیکل خانگی و ساورکراوت', 500, true, 40),
  ('Hot Dog — Salsa & Labneh', 'هات‌داگ — سالسا و لبنه', 'House hot dog with salsa and labneh', 'هات‌داگ دست‌ساز با سالسا و لبنه', 500, true, 50),
  ('Crispy Chicken Sandwich', 'ساندویچ سینه سوخاری', 'With Caesar and parmesan', 'با سس سزار و پارمسان', 600, true, 60),
  ('Classic Cheeseburger — Entrecôte', 'چیزبرگر کلاسیک — آنتروکوت', 'With entrecôte sauce', 'با سس آنتروکوت', 700, true, 70),
  ('Classic Cheeseburger — Peppercorn', 'چیزبرگر کلاسیک — پپرکورن', 'With peppercorn sauce', 'با سس پپرکورن', 700, true, 80),
  ('Pasta with Crispy Bacon', 'پاستا با بیکن کریسپی', 'Tomato cream sauce, crispy bacon', 'سس توماتو خامه، بیکن کریسپی', 700, true, 90),
  ('Pasta with Schnitzel', 'پاستا با شنیسل', 'Tomato cream sauce, chicken schnitzel', 'سس توماتو خامه، شنیسل مرغ', 700, true, 100),
  ('Meatball Plate with Mash', 'بشقاب میت‌بال با پوره', 'Peppercorn sauce, mashed potatoes', 'با سس پپرکورن و پورهٔ سیب‌زمینی', 800, true, 110),
  ('Caesar & Schnitzel Plate', 'بشقاب سزار و شنیسل', '', '', 800, true, 120),
  ('Korean Meatball Bowl', 'کاسه میت‌بال کره‌ای', 'Korean-style meatballs over rice', 'میت‌بال به سبک کره‌ای با برنج', 800, true, 130),
  ('Bolognese Pasta', 'پاستا بلونز', '', '', 800, true, 140),
  ('Roast Chicken with Chimichurri', 'جوجه روست با چیمیچوری', 'Roasted chicken, chimichurri, rice', 'جوجهٔ روست‌شده با سس چیمیچوری و برنج', 800, true, 150),
  ('Fried Chicken & Waffle — Orange', 'مرغ سوخاری و وافل — پرتقالی', 'With orange sauce', 'با سس پرتقال', 700, true, 160),
  ('Fried Chicken & Waffle — Curry', 'مرغ سوخاری و وافل — کاری', 'With curry sauce', 'با سس کاری', 700, true, 170),
  ('Fried Chicken & Waffle — Buffalo', 'مرغ سوخاری و وافل — بوفالو', 'With buffalo sauce', 'با سس بوفالو', 700, true, 180)
) AS t(title_en, title_fa, description_en, description_fa, price, is_available, sort_order)
ON CONFLICT DO NOTHING;

-- دسر
WITH cat AS (SELECT id FROM menu_categories WHERE slug = 'desserts')
INSERT INTO menu_items (category_id, title_en, title_fa, description_en, description_fa, price, is_available, sort_order)
SELECT (SELECT id FROM cat), * FROM (VALUES
  ('Vanilla Ice Cream with Brownie', 'بستنی وانیل دست‌ساز با براونی', 'Handmade vanilla ice cream, brownie, orange marmalade', 'بستنی وانیل دست‌ساز، براونی، مارمالاد پرتقال', 400::bigint, true, 10),
  ('Brownie Mousse Cup', 'گلدان موس براونی', '', '', 350, true, 20),
  ('Tiramisu', 'تیرامیسو', '', '', 350, true, 30)
) AS t(title_en, title_fa, description_en, description_fa, price, is_available, sort_order)
ON CONFLICT DO NOTHING;

-- تایید
SELECT c.label_fa, COUNT(i.id) AS items
FROM menu_categories c LEFT JOIN menu_items i ON i.category_id = c.id
GROUP BY c.id, c.label_fa, c.sort_order ORDER BY c.sort_order;
