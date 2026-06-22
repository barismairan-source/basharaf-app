-- ─────────────────────────────────────────────────────────────────
-- Migration فاز ۱۱ و ۱۲ — این را در Supabase SQL Editor اجرا کنید
-- ─────────────────────────────────────────────────────────────────

-- جدول تنظیمات داینامیک UI
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  "group" TEXT NOT NULL DEFAULT 'general',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- داده‌های پیش‌فرض
INSERT INTO app_settings (key, value, label, "group") VALUES
  -- گروه برند
  ('brand.name', 'با شرف', 'نام سامانه', 'brand'),
  ('brand.tagline', 'سامانه حسابداری شعب', 'توضیح کوتاه', 'brand'),

  -- گروه صفحه login
  ('login.title', 'حسابداری شعب، ساده و یکجا', 'عنوان اصلی صفحه ورود', 'login'),
  ('login.subtitle', 'مدیریت درآمد و هزینه چند شعبه با یک نگاه', 'زیرعنوان صفحه ورود', 'login'),
  ('login.feature1', 'گزارش لحظه‌ای تمام شعب', 'ویژگی اول', 'login'),
  ('login.feature2', 'کنترل و تایید تراکنش‌ها', 'ویژگی دوم', 'login'),
  ('login.feature3', 'تفکیک دقیق درآمد و هزینه', 'ویژگی سوم', 'login'),

  -- گروه داشبورد
  ('dashboard.greeting', 'خوش آمدید', 'پیام خوش‌آمدگویی داشبورد', 'dashboard'),
  ('dashboard.title', 'داشبورد', 'عنوان صفحه داشبورد', 'dashboard')

ON CONFLICT (key) DO NOTHING;

-- index برای group
CREATE INDEX IF NOT EXISTS app_settings_group_idx ON app_settings("group");

SELECT key, value, label FROM app_settings ORDER BY "group", key;
