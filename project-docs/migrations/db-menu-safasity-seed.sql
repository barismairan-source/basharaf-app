-- ═══════════════════════════════════════════════════════════════════
--  Seed: منوی واقعی صفاسیتی — ۶ دسته، ۱۸ آیتم (از safasity-menu.html)
--  فقط اضافه می‌کند — چیزی حذف نمی‌شود. آیتم تستی موجود («چیزبرگر
--  کلاسیک» زیر «غذای اصلی») دست‌نخورده می‌ماند؛ اگر دیگر لازمش ندارید،
--  خودتان از پنل «منو» حذفش کنید.
--  Idempotent — با ON CONFLICT (slug) روی دسته‌ها و WHERE NOT EXISTS
--  روی آیتم‌ها (بر اساس category_id + title_fa)، اجرای چندباره امن است.
--  همه‌ی آیتم‌ها inHall=true, inTakeaway=true (هم سالن هم بیرون‌بر).
--  نرخ مالیات دسته‌ها عمداً خالی می‌ماند (پیش‌فرض ۱۰٪ غذا از کد اعمال می‌شود).
--  ⚠️ این فایل روی دیتابیس واقعی اجرا نشده — فقط برای اجرای دستی توسط
--     مدیر پروژه (pgAdmin/DBeaver) پس از تهیه‌ی backup آماده شده است.
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO menu_categories (slug, label_en, label_fa, sort_order)
VALUES ('hot-dog', 'Hot Dog', 'هات‌داگ', 1)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO menu_categories (slug, label_en, label_fa, sort_order)
VALUES ('plates', 'Plates', 'بشقاب', 2)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO menu_categories (slug, label_en, label_fa, sort_order)
VALUES ('burger', 'Burger', 'برگر', 3)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO menu_categories (slug, label_en, label_fa, sort_order)
VALUES ('salad', 'Salad', 'سالاد', 4)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO menu_categories (slug, label_en, label_fa, sort_order)
VALUES ('dessert', 'Dessert', 'دسر', 5)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO menu_categories (slug, label_en, label_fa, sort_order)
VALUES ('rotation', 'On Rotation', 'روی چرخش', 6)
ON CONFLICT (slug) DO NOTHING;

-- ─── آیتم‌ها ───

INSERT INTO menu_items (category_id, title_en, title_fa, description_en, description_fa, price, price_takeaway, in_hall, in_takeaway, is_available, sort_order)
SELECT mc.id, 'Sumac Hot Dog', 'سوماک هات‌داگ', 'Brioche bun, house-made sausage, roasted pepper pickle, onion & parsley, tomato confit, sumac mayo', 'نان بریوش، سوسیس خانگی، پیکل فلفل کبابی، پیاز و جعفری، کنفی گوجه، مایونز سماق', 1150000, 1150000, true, true, true, 1
FROM menu_categories mc
WHERE mc.slug = 'hot-dog'
  AND NOT EXISTS (
    SELECT 1 FROM menu_items mi WHERE mi.category_id = mc.id AND mi.title_fa = 'سوماک هات‌داگ'
  );

INSERT INTO menu_items (category_id, title_en, title_fa, description_en, description_fa, price, price_takeaway, in_hall, in_takeaway, is_available, sort_order)
SELECT mc.id, 'Fried Chicken with Plum', 'مرغ سوخاری با آلو', 'Fried chicken, saffron plum sauce, tarragon mayo', 'مرغ سوخاری، سس آلو زعفران، مایونز ترخون', 1400000, 1400000, true, true, true, 1
FROM menu_categories mc
WHERE mc.slug = 'plates'
  AND NOT EXISTS (
    SELECT 1 FROM menu_items mi WHERE mi.category_id = mc.id AND mi.title_fa = 'مرغ سوخاری با آلو'
  );

INSERT INTO menu_items (category_id, title_en, title_fa, description_en, description_fa, price, price_takeaway, in_hall, in_takeaway, is_available, sort_order)
SELECT mc.id, 'Sausage & Tomato Sauce', 'سوسیس و سس تومات', 'House-made sausage, slow-cooked tomato purée, mozzarella, basil, cream', 'سوسیس خانگی، پوره گوجه پخته‌شده، موتزارلا، ریحان، خامه', 1300000, 1300000, true, true, true, 2
FROM menu_categories mc
WHERE mc.slug = 'plates'
  AND NOT EXISTS (
    SELECT 1 FROM menu_items mi WHERE mi.category_id = mc.id AND mi.title_fa = 'سوسیس و سس تومات'
  );

INSERT INTO menu_items (category_id, title_en, title_fa, description_en, description_fa, price, price_takeaway, in_hall, in_takeaway, is_available, sort_order)
SELECT mc.id, 'Roasted Chicken with Chimichurri & House Bread', 'مرغ رست‌شده با چیمیچوری و نان خانگی', 'Half roasted chicken, fries or mash, jus, tarragon mayo', 'نصف مرغ رست‌شده، سیب‌زمینی سرخ‌کرده یا پوره، ژو، مایونز ترخون', 1450000, 1450000, true, true, true, 3
FROM menu_categories mc
WHERE mc.slug = 'plates'
  AND NOT EXISTS (
    SELECT 1 FROM menu_items mi WHERE mi.category_id = mc.id AND mi.title_fa = 'مرغ رست‌شده با چیمیچوری و نان خانگی'
  );

INSERT INTO menu_items (category_id, title_en, title_fa, description_en, description_fa, price, price_takeaway, in_hall, in_takeaway, is_available, sort_order)
SELECT mc.id, 'Umami Melt', 'اومامی ملت', '180g chuck beef patty, 25% fat, jus sauce, gouda cheese sauce, caramelized onion, sautéed mushroom, truffle mayo', '۱۸۰ گرم گوشت سردست، چربی ۲۵٪، سس ژو، سس پنیر گودا، پیاز کاراملی، قارچ تفت‌داده‌شده، مایونز ترافل', 1400000, 1400000, true, true, true, 1
FROM menu_categories mc
WHERE mc.slug = 'burger'
  AND NOT EXISTS (
    SELECT 1 FROM menu_items mi WHERE mi.category_id = mc.id AND mi.title_fa = 'اومامی ملت'
  );

INSERT INTO menu_items (category_id, title_en, title_fa, description_en, description_fa, price, price_takeaway, in_hall, in_takeaway, is_available, sort_order)
SELECT mc.id, 'Classic Cheeseburger', 'چیزبرگر کلاسیک', '180g chuck beef patty, 25% fat, burger sauce, iceberg lettuce, onion slice, tomato slice, pickle', '۱۸۰ گرم گوشت سردست، چربی ۲۵٪، سس برگر، کاهو فرانسه، اسلایس پیاز، اسلایس گوجه، پیکل خیار', 1350000, 1350000, true, true, true, 2
FROM menu_categories mc
WHERE mc.slug = 'burger'
  AND NOT EXISTS (
    SELECT 1 FROM menu_items mi WHERE mi.category_id = mc.id AND mi.title_fa = 'چیزبرگر کلاسیک'
  );

INSERT INTO menu_items (category_id, title_en, title_fa, description_en, description_fa, price, price_takeaway, in_hall, in_takeaway, is_available, sort_order)
SELECT mc.id, 'Fried Chicken Breast Sandwich', 'ساندویچ سینه سوخاری', 'Fried chicken breast, smoked mango sauce, house-made mayo, roasted pepper pickle', 'سینه سوخاری، سس انبه‌دودی، مایونز دست‌ساز، پیکل فلفل کبابی', 1300000, 1300000, true, true, true, 3
FROM menu_categories mc
WHERE mc.slug = 'burger'
  AND NOT EXISTS (
    SELECT 1 FROM menu_items mi WHERE mi.category_id = mc.id AND mi.title_fa = 'ساندویچ سینه سوخاری'
  );

INSERT INTO menu_items (category_id, title_en, title_fa, description_en, description_fa, price, price_takeaway, in_hall, in_takeaway, is_available, sort_order)
SELECT mc.id, 'Mulberry Burger', 'برگر شاه‌توت', '180g chuck beef patty, 25% fat, house-made mayo, caramelized onion, bacon, blue cheese, mulberry marmalade', '۱۸۰ گرم گوشت سردست، چربی ۲۵٪، مایونز دست‌ساز، پیاز کاراملی، بیکن، بلوچیز، مارمالاد شاه‌توت', 1500000, 1500000, true, true, true, 4
FROM menu_categories mc
WHERE mc.slug = 'burger'
  AND NOT EXISTS (
    SELECT 1 FROM menu_items mi WHERE mi.category_id = mc.id AND mi.title_fa = 'برگر شاه‌توت'
  );

INSERT INTO menu_items (category_id, title_en, title_fa, description_en, description_fa, price, price_takeaway, in_hall, in_takeaway, is_available, sort_order)
SELECT mc.id, 'Peach & Tomato Salad', 'سالاد هلو و گوجه', 'Peach, cherry tomato, capers, vinaigrette', 'هلو، گوجه گیلاسی، کاپاریس، وینگرت', 650000, 650000, true, true, true, 1
FROM menu_categories mc
WHERE mc.slug = 'salad'
  AND NOT EXISTS (
    SELECT 1 FROM menu_items mi WHERE mi.category_id = mc.id AND mi.title_fa = 'سالاد هلو و گوجه'
  );

INSERT INTO menu_items (category_id, title_en, title_fa, description_en, description_fa, price, price_takeaway, in_hall, in_takeaway, is_available, sort_order)
SELECT mc.id, 'Bistro Caesar', 'بیسترو سزار', 'Caesar dressing, lettuce mix, croutons', 'سس سزار، میکس کاهو، کروتان', 650000, 650000, true, true, true, 2
FROM menu_categories mc
WHERE mc.slug = 'salad'
  AND NOT EXISTS (
    SELECT 1 FROM menu_items mi WHERE mi.category_id = mc.id AND mi.title_fa = 'بیسترو سزار'
  );

INSERT INTO menu_items (category_id, title_en, title_fa, description_en, description_fa, price, price_takeaway, in_hall, in_takeaway, is_available, sort_order)
SELECT mc.id, 'Cacio e Pepe Potato (Chef''s Special)', 'کچو پپه پونتیتو', 'House-made fries, potato foam, black pepper, parmesan', 'سیب‌زمینی سرخ‌کرده دست‌ساز، فوم سیب‌زمینی، فلفل سیاه، پارمسان', 750000, 750000, true, true, true, 3
FROM menu_categories mc
WHERE mc.slug = 'salad'
  AND NOT EXISTS (
    SELECT 1 FROM menu_items mi WHERE mi.category_id = mc.id AND mi.title_fa = 'کچو پپه پونتیتو'
  );

INSERT INTO menu_items (category_id, title_en, title_fa, description_en, description_fa, price, price_takeaway, in_hall, in_takeaway, is_available, sort_order)
SELECT mc.id, 'Berry Pavlova', 'بری پاولوا', 'Baked meringue, strawberry-berry coulis', 'مرنگ پخته‌شده، کولی توت‌فرنگی بری', 600000, 600000, true, true, true, 1
FROM menu_categories mc
WHERE mc.slug = 'dessert'
  AND NOT EXISTS (
    SELECT 1 FROM menu_items mi WHERE mi.category_id = mc.id AND mi.title_fa = 'بری پاولوا'
  );

INSERT INTO menu_items (category_id, title_en, title_fa, description_en, description_fa, price, price_takeaway, in_hall, in_takeaway, is_available, sort_order)
SELECT mc.id, 'Mango Ice Cream with Strawberry Sauce', 'بستنی انبه با سس توت‌فرنگی', 'House-made mango ice cream, strawberry sauce', 'بستنی دست‌ساز انبه، سس توت‌فرنگی', 500000, 500000, true, true, true, 2
FROM menu_categories mc
WHERE mc.slug = 'dessert'
  AND NOT EXISTS (
    SELECT 1 FROM menu_items mi WHERE mi.category_id = mc.id AND mi.title_fa = 'بستنی انبه با سس توت‌فرنگی'
  );

INSERT INTO menu_items (category_id, title_en, title_fa, description_en, description_fa, price, price_takeaway, in_hall, in_takeaway, is_available, sort_order)
SELECT mc.id, 'Mulberry Sorbet', 'سوربه شاه‌توت', 'Mulberry sorbet, chocolate crumble, chantilly cream', 'سوربه شاه‌توت، کرامبل شکلات، شانتی', 550000, 550000, true, true, true, 3
FROM menu_categories mc
WHERE mc.slug = 'dessert'
  AND NOT EXISTS (
    SELECT 1 FROM menu_items mi WHERE mi.category_id = mc.id AND mi.title_fa = 'سوربه شاه‌توت'
  );

INSERT INTO menu_items (category_id, title_en, title_fa, description_en, description_fa, price, price_takeaway, in_hall, in_takeaway, is_available, sort_order)
SELECT mc.id, 'Meatball Joey', 'میت‌بال جویی', 'Meatballs blended with parmesan & basil, marinara sauce, basil aioli', 'گوشت قلقلی ترکیب‌شده با پارمزان و ریحان، سس مارینارا، آیولی ریحان', 1300000, 1300000, true, true, true, 1
FROM menu_categories mc
WHERE mc.slug = 'rotation'
  AND NOT EXISTS (
    SELECT 1 FROM menu_items mi WHERE mi.category_id = mc.id AND mi.title_fa = 'میت‌بال جویی'
  );

INSERT INTO menu_items (category_id, title_en, title_fa, description_en, description_fa, price, price_takeaway, in_hall, in_takeaway, is_available, sort_order)
SELECT mc.id, 'Steak Sandwich with Saffron Aioli', 'ساندویچ استیک با آیولی زعفران', '150g sliced beef tenderloin, saffron aioli, onion, parsley & sumac, tomato sauce, brioche roll', '۱۵۰ گرم اسلایس فیله گوساله، آیولی زعفران، پیاز و جعفری و سماق، سس گوجه، بریوش رول', 2400000, 2400000, true, true, true, 2
FROM menu_categories mc
WHERE mc.slug = 'rotation'
  AND NOT EXISTS (
    SELECT 1 FROM menu_items mi WHERE mi.category_id = mc.id AND mi.title_fa = 'ساندویچ استیک با آیولی زعفران'
  );

INSERT INTO menu_items (category_id, title_en, title_fa, description_en, description_fa, price, price_takeaway, in_hall, in_takeaway, is_available, sort_order)
SELECT mc.id, 'Classic Philly Cheesesteak', 'فیلی چیز استیک کلاسیک', '150g sliced beef tenderloin, brioche roll, sautéed onion & bell pepper, cheddar sauce', '۱۵۰ گرم اسلایس فیله گوساله، بریوش رول، پیاز و فلفل دلمه تفت‌داده‌شده، سس چدار', 2200000, 2200000, true, true, true, 3
FROM menu_categories mc
WHERE mc.slug = 'rotation'
  AND NOT EXISTS (
    SELECT 1 FROM menu_items mi WHERE mi.category_id = mc.id AND mi.title_fa = 'فیلی چیز استیک کلاسیک'
  );

INSERT INTO menu_items (category_id, title_en, title_fa, description_en, description_fa, price, price_takeaway, in_hall, in_takeaway, is_available, sort_order)
SELECT mc.id, 'Entrecôte Steak Sandwich', 'ساندویچ استیک آنتروکوت', '150g sliced beef tenderloin, crispy shoestring fries, entrecôte sauce', '۱۵۰ گرم اسلایس فیله گوساله، سیب‌زمینی خلال برشته، سس آنتروکوت', 2400000, 2400000, true, true, true, 4
FROM menu_categories mc
WHERE mc.slug = 'rotation'
  AND NOT EXISTS (
    SELECT 1 FROM menu_items mi WHERE mi.category_id = mc.id AND mi.title_fa = 'ساندویچ استیک آنتروکوت'
  );

-- ─── تأیید ───
SELECT mc.label_fa AS دسته, COUNT(mi.id) AS تعداد_آیتم
FROM menu_categories mc LEFT JOIN menu_items mi ON mi.category_id = mc.id
GROUP BY mc.label_fa, mc.sort_order ORDER BY mc.sort_order;

-- ═══════════════════════════════════════════════════════════════════
--  بازگشت (Rollback) — فقط آیتم‌ها/دسته‌های همین seed، با همین نام‌ها:
--  DELETE FROM menu_items WHERE title_fa IN (
--    'سوماک هات‌داگ',
--    'مرغ سوخاری با آلو',
--    'سوسیس و سس تومات',
--    'مرغ رست‌شده با چیمیچوری و نان خانگی',
--    'اومامی ملت',
--    'چیزبرگر کلاسیک',
--    'ساندویچ سینه سوخاری',
--    'برگر شاه‌توت',
--    'سالاد هلو و گوجه',
--    'بیسترو سزار',
--    'کچو پپه پونتیتو',
--    'بری پاولوا',
--    'بستنی انبه با سس توت‌فرنگی',
--    'سوربه شاه‌توت',
--    'میت‌بال جویی',
--    'ساندویچ استیک با آیولی زعفران',
--    'فیلی چیز استیک کلاسیک',
--    'ساندویچ استیک آنتروکوت'
--  );
--  DELETE FROM menu_categories WHERE slug IN ('hot-dog', 'plates', 'burger', 'salad', 'dessert', 'rotation');
-- ═══════════════════════════════════════════════════════════════════
