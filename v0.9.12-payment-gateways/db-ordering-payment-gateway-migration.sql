-- db-ordering-payment-gateway-migration.sql
-- پیکربندی دستی درگاه پرداخت آنلاین از پنل تنظیمات سفارش (به‌جای env)
-- ord_settings: انتخاب درگاه فعال (zarinpal/idpay/zibal) + کلید/مرچنت هر درگاه.
-- Idempotent; safe to re-run.

ALTER TABLE ord_settings ADD COLUMN IF NOT EXISTS pay_gateway text NOT NULL DEFAULT 'zarinpal';
ALTER TABLE ord_settings ADD COLUMN IF NOT EXISTS zarinpal_merchant_id text;
ALTER TABLE ord_settings ADD COLUMN IF NOT EXISTS idpay_api_key text;
ALTER TABLE ord_settings ADD COLUMN IF NOT EXISTS zibal_merchant_id text;
