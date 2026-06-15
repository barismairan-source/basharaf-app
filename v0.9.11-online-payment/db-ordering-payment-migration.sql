-- db-ordering-payment-migration.sql
-- Box 4: پرداخت آنلاین (Zarinpal) — افزودن pay_authority به orders برای
-- lookup در callback، و note به order_events برای لاگ رویدادهای پرداخت
-- بدون تغییر state machine وضعیت سفارش (from_status = to_status).
-- Idempotent; safe to re-run.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS pay_authority text;
CREATE INDEX IF NOT EXISTS orders_pay_authority_idx ON orders (pay_authority);

ALTER TABLE order_events ADD COLUMN IF NOT EXISTS note text;
