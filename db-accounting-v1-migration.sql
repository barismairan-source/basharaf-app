-- db-accounting-v1-migration.sql
-- Accounting overhaul v1: proforma status + invoice_code field
-- Run once in pgAdmin after all previous migrations have been applied.
-- All statements are idempotent.

-- ===== 1. Add 'proforma' value to tx_status enum =====
-- PostgreSQL ALTER TYPE ... ADD VALUE is not transactional, but is safe to run
-- on an existing enum. IF NOT EXISTS prevents duplicate-value errors.

ALTER TYPE tx_status ADD VALUE IF NOT EXISTS 'proforma';

-- ===== 2. Add invoice_code column to transactions =====

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'transactions'
      AND column_name = 'invoice_code'
  ) THEN
    ALTER TABLE transactions ADD COLUMN invoice_code TEXT;
  END IF;
END $$;

-- Optional index for fast lookups by invoice code
CREATE INDEX IF NOT EXISTS tx_invoice_code_idx
  ON transactions (invoice_code)
  WHERE invoice_code IS NOT NULL;
