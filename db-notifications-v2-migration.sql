-- db-notifications-v2-migration.sql
-- Migration: Notification System v2 -- Deep Linking + Rules Engine
-- idempotent: safe to run multiple times
-- Run in pgAdmin on Liara before deploying v0.9.32

-- 1. Add new values to notif_type enum (postgres requires separate ALTER per value)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'warning'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notif_type')
  ) THEN
    ALTER TYPE notif_type ADD VALUE 'warning';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'critical'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notif_type')
  ) THEN
    ALTER TYPE notif_type ADD VALUE 'critical';
  END IF;
END $$;

-- 2. Add new columns to notifications table
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS action_url TEXT,
  ADD COLUMN IF NOT EXISTS entity_id  TEXT;

-- 3. Create notification_rules table
CREATE TABLE IF NOT EXISTS notification_rules (
  key         TEXT        PRIMARY KEY,
  label       TEXT        NOT NULL,
  description TEXT,
  enabled     BOOLEAN     NOT NULL DEFAULT TRUE,
  threshold   INTEGER,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Seed default rules (idempotent)
INSERT INTO notification_rules (key, label, description, enabled, threshold) VALUES
  ('pending_approval',  'تراکنش در انتظار تأیید',    'اعلان وقتی BranchUser تراکنش ثبت می‌کند',          TRUE,  NULL),
  ('voucher_pending',   'برگه انبار در انتظار تأیید', 'اعلان وقتی برگه انبار ثبت یا معکوس می‌شود',       TRUE,  NULL),
  ('low_stock',         'هشدار کسری موجودی',           'اعلان وقتی clamp انبار رخ می‌دهد',                 TRUE,  NULL),
  ('inventory_clamp',   'هشدار کسر بیش از موجودی',    'اعلان وقتی کسر انبار بیشتر از موجودی است',        TRUE,  NULL),
  ('po_received',       'سفارش خرید دریافت شد',        'اعلان وقتی سفارش خرید تأیید دریافت می‌شود',       TRUE,  NULL),
  ('high_value_tx',     'تراکنش با مبلغ بالا',         'اعلان وقتی مبلغ تراکنش از آستانه بیشتر است',      FALSE, 50000000)
ON CONFLICT (key) DO NOTHING;
