-- ─────────────────────────────────────────────────────────────────
-- Migration فاز ۱۵ — در Supabase SQL Editor اجرا کنید
-- ─────────────────────────────────────────────────────────────────

-- ── جدول Audit Log ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  meta TEXT,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_log_action_idx ON audit_log(action);
CREATE INDEX IF NOT EXISTS audit_log_user_idx ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON audit_log(created_at);

-- ── جدول App Settings (اگر از فاز ۱۲ اجرا نشده) ─────────────────
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  "group" TEXT NOT NULL DEFAULT 'general',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO app_settings (key, value, label, "group") VALUES
  ('brand.name', 'با شرف', 'نام سامانه', 'brand'),
  ('brand.tagline', 'سامانه حسابداری شعب', 'توضیح کوتاه', 'brand'),
  ('login.title', 'حسابداری شعب، ساده و یکجا', 'عنوان صفحه ورود', 'login'),
  ('login.subtitle', 'مدیریت درآمد و هزینه چند شعبه با یک نگاه', 'زیرعنوان', 'login'),
  ('login.feature1', 'گزارش لحظه‌ای تمام شعب', 'ویژگی ۱', 'login'),
  ('login.feature2', 'کنترل و تایید تراکنش‌ها', 'ویژگی ۲', 'login'),
  ('login.feature3', 'تفکیک دقیق درآمد و هزینه', 'ویژگی ۳', 'login'),
  ('dashboard.greeting', 'خوش آمدید', 'پیام خوش‌آمدگویی', 'dashboard'),
  ('dashboard.title', 'داشبورد', 'عنوان صفحه', 'dashboard')
ON CONFLICT (key) DO NOTHING;

-- ── تایید ────────────────────────────────────────────────────────
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('audit_log', 'app_settings');
