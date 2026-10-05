-- ═══════════════════════════════════════════════════════════════════
--  Migration: محتوای منوی هفته‌ی ۳ اکتبر (Safasity Menu - Oct 3.pdf)
--  فقط داده — هیچ تغییر schema ندارد، دیپلوی کد لازم نیست.
--   ۱) اومامی ملت کامل حذف می‌شود (طبق دستور کاربر).
--   ۲) پپر نوآر (برگر جدید) اضافه می‌شود.
--   ۳) وینگز بوفالو به منو روزانه اضافه می‌شود.
--   ۴) دسته‌ی جدید «ویژه‌ی پنجشنبه و جمعه» با دو فیله.
--   ۵) برگر شاه‌توت در منوی جدید نیست → مخفی (حذف نه، قابل برگشت از پنل).
--   ۶) ساندویچ باترچیکن طبق منوی چاپی زیر «برگر» می‌رود.
--   ۷) میلفوی انجیر و پسته ۷۰۰ → ۸۰۰؛ مرغ سوخاری با سس پرتقال «(تند)» می‌گیرد؛
--      توضیح مرغ رست‌شده «سس چیمیچوری» می‌گیرد.
--  Idempotent — اجرای چندباره امن است.
--  ⚠️ این فایل روی دیتابیس واقعی اجرا نشده — فقط برای اجرای دستی توسط
--     مدیر پروژه (pgAdmin/DBeaver) پس از تهیه‌ی backup آماده شده است.
-- ═══════════════════════════════════════════════════════════════════

-- ─── ۱) حذف کامل اومامی ─────────────────────────────────────────────
-- ارجاع‌های inv_recipes/فروش به menu_items با ON DELETE SET NULL هستند؛ سابقه‌ی فروش دست نمی‌خورد.
DELETE FROM menu_items WHERE title_fa = 'اومامی ملت';

-- ─── ۲) پپر نوآر ─────────────────────────────────────────────────────
INSERT INTO menu_items (category_id, title_en, title_fa, description_en, description_fa, price, price_takeaway, in_hall, in_takeaway, is_available, sort_order)
SELECT (SELECT id FROM menu_categories WHERE slug = 'burger'),
  'Pepper Noir', 'پپر نوآر',
  '150g chuck beef, 25% fat, sautéed spinach, caramelized onion, shoestring fries, pickled peppercorns, mayo, black pepper cream sauce',
  '۱۵۰ گرم گوشت سردست با ۲۵ درصد چربی، اسفناج تفت داده شده، پیاز کاراملی، سیب‌زمینی خلال، ترشی دانه فلفل، سس مایونز، سس فلفل سیاه و خامه',
  1600000, 1600000, true, true, true, 20
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE title_fa = 'پپر نوآر');

-- ─── ۳) وینگز بوفالو ─────────────────────────────────────────────────
INSERT INTO menu_items (category_id, title_en, title_fa, description_en, description_fa, price, price_takeaway, in_hall, in_takeaway, is_available, sort_order)
SELECT (SELECT id FROM menu_categories WHERE slug = 'rotation'),
  'Buffalo Wings', 'وینگز بوفالو',
  '4 pieces, drums & flats',
  '۴ تکه بازو و بال',
  800000, 800000, true, true, true, 30
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE title_fa = 'وینگز بوفالو');

-- ─── ۴) ویژه‌ی پنجشنبه و جمعه ────────────────────────────────────────
INSERT INTO menu_categories (slug, label_en, label_fa, sort_order)
SELECT 'weekend', 'Thursday & Friday', 'ویژه‌ی پنجشنبه و جمعه', 7
WHERE NOT EXISTS (SELECT 1 FROM menu_categories WHERE slug = 'weekend');

INSERT INTO menu_items (category_id, title_en, title_fa, description_en, description_fa, price, price_takeaway, in_hall, in_takeaway, is_available, sort_order)
SELECT (SELECT id FROM menu_categories WHERE slug = 'weekend'),
  'Filet with Entrecôte Sauce', 'فیله با سس آنتروکوت',
  'Beef filet, entrecôte sauce, fries',
  'فیله گوساله، سس آنتروکوت، فرایز',
  2900000, 2900000, true, true, true, 1
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE title_fa = 'فیله با سس آنتروکوت');

INSERT INTO menu_items (category_id, title_en, title_fa, description_en, description_fa, price, price_takeaway, in_hall, in_takeaway, is_available, sort_order)
SELECT (SELECT id FROM menu_categories WHERE slug = 'weekend'),
  'Filet with Peppercorn Sauce', 'فیله با سس پپرکورن',
  'Beef filet, peppercorn sauce, crispy potatoes',
  'فیله گوساله، سس پپرکورن، سیب‌زمینی کریسپی',
  2900000, 2900000, true, true, true, 2
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE title_fa = 'فیله با سس پپرکورن');

-- ─── ۵) برگر شاه‌توت مخفی ───────────────────────────────────────────
UPDATE menu_items SET is_available = false WHERE title_fa = 'برگر شاه‌توت';

-- ─── ۶) باترچیکن زیر «برگر» (مطابق منوی چاپی) ───────────────────────
UPDATE menu_items SET category_id = (SELECT id FROM menu_categories WHERE slug = 'burger'), sort_order = 15
WHERE title_fa = 'ساندویچ باترچیکن سوخاری (تند)';

-- ─── ۷) قیمت/عنوان/توضیح ─────────────────────────────────────────────
UPDATE menu_items SET price = 800000, price_takeaway = 800000 WHERE title_fa = 'میلفوی انجیر و پسته';

UPDATE menu_items SET title_fa = 'مرغ سوخاری با سس پرتقال (تند)', title_en = 'Spicy Fried Chicken with Orange Sauce'
WHERE title_fa = 'مرغ سوخاری با سس پرتقال';

UPDATE menu_items
SET description_fa = 'نصف مرغ رست‌شده، سیب‌زمینی سرخ‌کرده یا پوره، سس چیمیچوری، ژو، مایونز ترخون',
    description_en = 'Half roasted chicken, fries or mash, chimichurri sauce, jus, tarragon mayo'
WHERE title_fa = 'مرغ رست‌شده با چیمیچوری و نان خانگی';

-- ─── تأیید ───
SELECT c.label_fa AS category, i.title_fa, i.price, i.is_available
FROM menu_items i JOIN menu_categories c ON c.id = i.category_id
WHERE i.is_available = true
ORDER BY c.sort_order, i.sort_order;
