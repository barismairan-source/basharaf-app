-- db-ordering-pending-migrations-combined.sql
-- اجرای یک‌جای ۴ migration معلق ماژول سفارش بیرون‌بر (به‌ترتیب زمانی):
--   v0.9.9  db-ordering-checkout-migration.sql
--   v0.9.10 db-ordering-board-realtime-migration.sql
--   v0.9.11 db-ordering-payment-migration.sql
--   v0.9.12 db-ordering-payment-gateway-migration.sql
-- همه idempotent — اجرای دوباره بی‌خطر است. این فایل فقط ستون/ایندکس/پابلیکیشن
-- اضافه می‌کند، هیچ داده‌ای حذف یا تغییر نمی‌دهد.

-- ── v0.9.9: /order/checkout — ستون‌های idempotency + زمان پیکاپ ──
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_time  text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_token text;

CREATE UNIQUE INDEX IF NOT EXISTS orders_client_token_uidx ON orders (client_token);

-- ── v0.9.10: /orders پنل پرسنل — افزودن جداول به Realtime ──
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  ALTER PUBLICATION supabase_realtime ADD TABLE order_lines;
  ALTER PUBLICATION supabase_realtime ADD TABLE order_events;
EXCEPTION WHEN others THEN
  -- روی Liara یا اگر publication نیست، رد شو
  NULL;
END $$;

-- ── v0.9.11: پرداخت آنلاین Zarinpal — pay_authority + order_events.note ──
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pay_authority text;
CREATE INDEX IF NOT EXISTS orders_pay_authority_idx ON orders (pay_authority);

ALTER TABLE order_events ADD COLUMN IF NOT EXISTS note text;

-- ── v0.9.12: پیکربندی درگاه پرداخت از پنل تنظیمات سفارش ──
ALTER TABLE ord_settings ADD COLUMN IF NOT EXISTS pay_gateway text NOT NULL DEFAULT 'zarinpal';
ALTER TABLE ord_settings ADD COLUMN IF NOT EXISTS zarinpal_merchant_id text;
ALTER TABLE ord_settings ADD COLUMN IF NOT EXISTS idpay_api_key text;
ALTER TABLE ord_settings ADD COLUMN IF NOT EXISTS zibal_merchant_id text;
