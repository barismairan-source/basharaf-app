-- ═══════════════════════════════════════════════════════════════
-- رفع باگ: ستون categories.kind باید type باشد
-- روی دیتابیس Liara (postgres) اجرا کنید
-- ═══════════════════════════════════════════════════════════════

-- ۱. اگر ستون kind وجود دارد، به type تغییر نام بده
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='categories' AND column_name='kind') THEN
    ALTER TABLE categories RENAME COLUMN kind TO type;
  END IF;
END $$;

-- ۲. اگر دسته‌ای ثبت نشده، دسته‌های پیش‌فرض را اضافه کن
INSERT INTO categories (name, type) VALUES
  ('فروش غذا',      'income'),
  ('فروش نوشیدنی',   'income'),
  ('سایر درآمد',     'income'),
  ('خرید مواد اولیه', 'expense'),
  ('حقوق پرسنل',     'expense'),
  ('اجاره',          'expense'),
  ('قبوض',           'expense'),
  ('تعمیرات',        'expense'),
  ('سایر هزینه',     'expense')
ON CONFLICT DO NOTHING;

-- ۳. تأیید
SELECT column_name FROM information_schema.columns WHERE table_name='categories' ORDER BY ordinal_position;
SELECT count(*) AS categories_count FROM categories;
