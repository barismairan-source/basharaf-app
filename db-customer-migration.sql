-- ======================================================================
-- migration: باکس الف — ماژول مشتری آنلاین (OTP)
-- idempotent — ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS
-- جداول جدید کاملاً جدا از جدول customers (CRM) هستند
-- ======================================================================

-- ─── جدول مشتریان آنلاین (لاگین OTP) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS web_customers (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       text        NOT NULL,
  name        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS web_customers_phone_uniq
  ON web_customers (phone);

-- ─── آدرس‌های ذخیره‌شده مشتری ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS web_customer_addresses (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid        NOT NULL REFERENCES web_customers(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  address     text        NOT NULL,
  lat         numeric,
  lng         numeric,
  is_default  boolean     NOT NULL DEFAULT false,
  sort_order  integer     NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS web_customer_addresses_customer_idx
  ON web_customer_addresses (customer_id);

-- ─── کدهای یک‌بار مصرف (OTP) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS web_customer_otp (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       text        NOT NULL,
  code        text        NOT NULL,
  expires_at  timestamptz NOT NULL,
  used        boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS web_customer_otp_phone_used_idx
  ON web_customer_otp (phone, used);

-- ─── ستون اتصال سفارش به مشتری آنلاین (nullable — سفارش‌های guest دست نمی‌خورند) ─
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS order_customer_id uuid REFERENCES web_customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS orders_order_customer_idx
  ON orders (order_customer_id)
  WHERE order_customer_id IS NOT NULL;
