-- ═══════════════════════════════════════════════════════════════════
--  Migration: کد کالا (SKU) برای رسپی‌ها (آیتم‌های قابل‌فروش، نه مواد خام)
--  قبلاً فقط inv_items (مواد خام انبار) کد داشتند؛ خودِ غذا/نوشیدنی که
--  می‌فروشید (inv_recipes) کد نداشت. این ستون همان الگوی inv_items را
--  برای inv_recipes تکرار می‌کند — nullable چون رسپی‌های قدیمی کد ندارند،
--  با partial unique index (فقط وقتی کد داده شده، در همان شعبه یکتا باشد).
--  Idempotent — اجرای چندباره امن است. هیچ داده‌ای حذف/تغییر نمی‌شود.
--  ⚠️ این فایل روی دیتابیس واقعی اجرا نشده — فقط برای اجرای دستی توسط
--     مدیر پروژه (pgAdmin/DBeaver) پس از تهیه‌ی backup آماده شده است.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE inv_recipes ADD COLUMN IF NOT EXISTS code text;

CREATE UNIQUE INDEX IF NOT EXISTS inv_recipes_branch_code_uniq
  ON inv_recipes (branch_id, code)
  WHERE code IS NOT NULL;

-- ─── تأیید ───
SELECT 'inv_recipes.code column + unique index created' AS status;
SELECT COUNT(*) AS recipes_with_code FROM inv_recipes WHERE code IS NOT NULL;
SELECT COUNT(*) AS recipes_without_code FROM inv_recipes WHERE code IS NULL;

-- ═══════════════════════════════════════════════════════════════════
--  بازگشت (Rollback):
--  DROP INDEX IF EXISTS inv_recipes_branch_code_uniq;
--  ALTER TABLE inv_recipes DROP COLUMN IF EXISTS code;
-- ═══════════════════════════════════════════════════════════════════
