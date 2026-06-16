-- db-ordering-fulfillment-migration.sql
-- باکس ۵ سرویس سفارش — یکپارچه‌سازی تکمیل سفارش با هسته‌ی مالی/انبار:
--   - order_lines.menu_item_id: نگاشت هر خط سفارش به menu_items (برای کسر انبار از رسپی)
--   - orders.sale_transaction_id: ضد-تکرار — حداکثر یک تراکنش فروش به ازای هر سفارش
--   - menu_categories.vat_rate: نرخ VAT (٪) هر دسته‌ی منو — null یعنی پیش‌فرض ۱۰٪ (غذا)
-- idempotent — اجرای دوباره بی‌خطر است.

ALTER TABLE order_lines ADD COLUMN IF NOT EXISTS menu_item_id uuid REFERENCES menu_items(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS order_lines_menu_item_idx ON order_lines (menu_item_id);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS sale_transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL;

ALTER TABLE menu_categories ADD COLUMN IF NOT EXISTS vat_rate integer;
