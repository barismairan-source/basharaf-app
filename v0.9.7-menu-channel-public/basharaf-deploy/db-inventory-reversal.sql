-- Phase 1 / Section D — برگه‌ی اصلاحی (Reversal) برای برگه‌های approved
--
-- برگه‌ی approved هرگز ویرایش یا حذف نمی‌شود (تا موجودی/میانگین موزون drift
-- نکند). برای اصلاح یک برگه‌ی approved، یک برگه‌ی معکوس pending جدید ساخته
-- می‌شود که parent_voucher_id آن به برگه‌ی اصلی اشاره دارد. این برگه‌ی
-- معکوس باید جداگانه توسط حسابدار/SuperAdmin تأیید شود تا اثرش روی موجودی
-- و حسابداری اعمال شود.

ALTER TABLE inv_vouchers
  ADD COLUMN IF NOT EXISTS parent_voucher_id uuid REFERENCES inv_vouchers(id);

COMMENT ON COLUMN inv_vouchers.parent_voucher_id IS
  'اگر این برگه یک برگه‌ی اصلاحی (reversal) باشد، شناسه‌ی برگه‌ی approved اصلی که با این برگه اصلاح می‌شود.';
