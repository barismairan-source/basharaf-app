-- ═══════════════════════════════════════════════════════════════
-- Migration نسخه ۰.۴ — مالیات، بدهکاران/بستانکاران، دفتر کل
-- در Supabase SQL Editor اجرا کنید
-- ═══════════════════════════════════════════════════════════════

-- ۱. جدول contacts (طرف‌حساب‌ها)
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'customer',
  phone TEXT,
  note TEXT,
  balance BIGINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS contacts_type_idx ON contacts(type);
CREATE INDEX IF NOT EXISTS contacts_active_idx ON contacts(is_active);

-- ۲. فیلدهای جدید در transactions
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vat_amount BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_credit BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS tx_contact_idx ON transactions(contact_id);

-- ۳. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE contacts;

-- ۴. تنظیم نرخ مالیات در app_settings
INSERT INTO app_settings (key, value, label, "group") VALUES
  ('finance.vat_rate', '10', 'نرخ مالیات ارزش افزوده (٪)', 'finance')
ON CONFLICT (key) DO UPDATE SET value = '10';

-- ۵. تایید
SELECT
  (SELECT COUNT(*) FROM contacts) AS contacts_count,
  (SELECT value FROM app_settings WHERE key = 'finance.vat_rate') AS vat_rate;
