-- ═══════════════════════════════════════════════════════════════════
--  Migration: رسپی‌بوک عمومی basharaf.me/safasity/recipes
--  ۴ جدول جدید — جدا از inv_recipes (رسپی‌های داخلی بهای تمام‌شده):
--    recipe_categories   دسته‌بندی (برگر/پاستا/...)
--    recipes             خودِ رسپی (عنوان، پروتئین، مراحل، لینک ویدیو)
--    ingredient_tags     واژگان یکدست مواد اولیه (برای autocomplete + سرچ)
--    recipe_ingredients  اتصال رسپی↔تگ + مقدار نمایشی (مثلاً «۲۰۰ گرم»)
--  هیچ جدول موجودی تغییر نمی‌کند. Idempotent — اجرای چندباره امن است.
--  ⚠️ این فایل روی دیتابیس واقعی اجرا نشده — فقط برای اجرای دستی توسط
--     مدیر پروژه (pgAdmin/DBeaver) پس از تهیه‌ی backup آماده شده است.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS recipe_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

DO $$ BEGIN CREATE TYPE recipe_protein AS ENUM ('chicken','red_meat','seafood','vegetarian','vegan','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS recipes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                TEXT NOT NULL UNIQUE,
  title               TEXT NOT NULL,
  summary             TEXT NOT NULL DEFAULT '',
  category_id         UUID REFERENCES recipe_categories(id) ON DELETE SET NULL,
  protein             recipe_protein NOT NULL DEFAULT 'other',
  prep_time_minutes   INTEGER,
  servings            TEXT,
  steps               JSONB NOT NULL DEFAULT '[]',
  instagram_url       TEXT,
  video_url           TEXT,
  image_url           TEXT,
  is_published        BOOLEAN NOT NULL DEFAULT true,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ingredient_tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id           UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_tag_id   UUID NOT NULL REFERENCES ingredient_tags(id) ON DELETE RESTRICT,
  quantity_label      TEXT NOT NULL DEFAULT '',
  sort_order          INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS recipe_ingredients_recipe_idx ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS recipe_ingredients_tag_idx ON recipe_ingredients(ingredient_tag_id);

-- ─── تأیید ───
SELECT 'recipe_book tables ready' AS status;
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('recipe_categories', 'recipes', 'ingredient_tags', 'recipe_ingredients');

-- ═══════════════════════════════════════════════════════════════════
--  بازگشت (Rollback):
--  DROP TABLE IF EXISTS recipe_ingredients;
--  DROP TABLE IF EXISTS recipes;
--  DROP TABLE IF EXISTS ingredient_tags;
--  DROP TABLE IF EXISTS recipe_categories;
--  DROP TYPE IF EXISTS recipe_protein;
-- ═══════════════════════════════════════════════════════════════════
