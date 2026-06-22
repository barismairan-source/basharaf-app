-- ═══════════════════════════════════════════════════════════════
-- Migration: صندوق‌ها و حساب‌های بانکی
-- در Supabase SQL Editor اجرا کنید
-- ═══════════════════════════════════════════════════════════════

-- ۱. اضافه کردن 'transfer' به tx_type enum
ALTER TYPE tx_type ADD VALUE IF NOT EXISTS 'transfer';

-- ۲. جدول accounts
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

-- ۳. اضافه کردن account_id به transactions
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS destination_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tx_account_idx ON transactions(account_id);

-- ۴. داده‌های نمونه برای accounts
INSERT INTO accounts (name, type, balance) VALUES
  ('صندوق نقدی اصلی', 'cash', 0),
  ('حساب بانک ملی', 'bank', 0),
  ('دستگاه پوز', 'pos', 0)
ON CONFLICT DO NOTHING;

-- ۵. تایید
SELECT id, name, type, balance FROM accounts;
