-- Batch 3 / Step 3 — Menu ↔ Inventory auto-deduction (backflushing)
--
-- اضافه کردن ستون sale_meta به transactions: متادیتای فروش منو
--   { lines: [{ menuItemId, qty }], deductedAt?: ISOString }
-- وقتی یک تراکنش income با این متادیتا تأیید می‌شود، رسپی هر آیتم منو
-- (از طریق inv_recipes.menu_item_id) باز می‌شود و کسر موجودی + ثبت COGS
-- به‌صورت سیستمی (بدون نیاز به maker-checker جداگانه) انجام می‌شود.
-- فیلد deductedAt از کسر تکراری جلوگیری می‌کند (idempotency).

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS sale_meta jsonb;

COMMENT ON COLUMN transactions.sale_meta IS
  'متادیتای فروش منو: { lines: [{ menuItemId, qty }], deductedAt }. برای backflushing خودکار انبار از روی فروش.';
