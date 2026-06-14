-- db-ordering-checkout-migration.sql
-- Box 2: /order/checkout — adds idempotency + pickup-time columns to `orders`.
-- Additive on top of db-ordering-migration.sql (already applied). Idempotent.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_time  text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_token text;

CREATE UNIQUE INDEX IF NOT EXISTS orders_client_token_uidx ON orders (client_token);
