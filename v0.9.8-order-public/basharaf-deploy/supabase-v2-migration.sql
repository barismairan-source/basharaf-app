-- ═══════════════════════════════════════════════════════════════
-- Migration نسخه ۰.۲ — همه تغییرات یکجا
-- در Supabase SQL Editor اجرا کنید
-- ═══════════════════════════════════════════════════════════════

-- ۱. اضافه کردن 'transfer' به tx_type (اگر قبلاً اضافه نشده)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'transfer'
    AND enumtypid = 'tx_type'::regtype
  ) THEN
    ALTER TYPE tx_type ADD VALUE 'transfer';
  END IF;
END$$;

-- ۲. جدول accounts (اگر قبلاً نساختید)
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'cash',
  balance BIGINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS accounts_branch_idx ON accounts(branch_id);
CREATE INDEX IF NOT EXISTS accounts_active_idx ON accounts(is_active);

-- ۳. فیلدهای جدید در transactions
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS receipt_url TEXT,
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS destination_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

-- ۴. categoryId و categoryName را nullable کن (برای transfer)
ALTER TABLE transactions
  ALTER COLUMN category_id DROP NOT NULL;

-- ۵. جدول app_settings (اگر نساختید)
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  "group" TEXT NOT NULL DEFAULT 'general',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO app_settings (key, value, label, "group") VALUES
  ('brand.name',       'با شرف',                         'نام سامانه',      'brand'),
  ('brand.tagline',    'سامانه حسابداری شعب',             'توضیح کوتاه',     'brand'),
  ('login.title',      'حسابداری شعب، ساده و یکجا',       'عنوان ورود',      'login'),
  ('login.subtitle',   'مدیریت درآمد و هزینه چند شعبه',   'زیرعنوان',        'login'),
  ('login.feature1',   'گزارش لحظه‌ای تمام شعب',          'ویژگی ۱',         'login'),
  ('login.feature2',   'کنترل و تایید تراکنش‌ها',         'ویژگی ۲',         'login'),
  ('login.feature3',   'تفکیک دقیق درآمد و هزینه',        'ویژگی ۳',         'login'),
  ('dashboard.greeting','خوش آمدید',                      'پیام داشبورد',    'dashboard'),
  ('dashboard.title',  'داشبورد',                         'عنوان صفحه',      'dashboard')
ON CONFLICT (key) DO NOTHING;

-- ۶. جدول audit_log
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

-- ۷. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE accounts;

-- ۸. چند حساب نمونه (اختیاری)
INSERT INTO accounts (name, type, balance) VALUES
  ('صندوق نقدی اصلی', 'cash', 0),
  ('حساب بانک ملی',   'bank', 0),
  ('دستگاه پوز',      'pos',  0)
ON CONFLICT DO NOTHING;

-- ۹. تایید
SELECT
  (SELECT COUNT(*) FROM accounts)   AS accounts_count,
  (SELECT COUNT(*) FROM app_settings) AS settings_count,
  (SELECT COUNT(*) FROM audit_log)  AS audit_count,
  EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'transfer' AND enumtypid = 'tx_type'::regtype
  ) AS transfer_enum_ok;
