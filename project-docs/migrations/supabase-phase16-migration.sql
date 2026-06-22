-- ─────────────────────────────────────────────────────────────────
-- Migration فاز ۱۶ — در Supabase SQL Editor اجرا کنید
-- ─────────────────────────────────────────────────────────────────

-- اضافه کردن فیلد receipt_url به جدول transactions
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- ─── Supabase Storage Bucket ─────────────────────────────────────
-- این bucket را باید از Dashboard بسازید:
-- Storage → New bucket → نام: "receipts" → Public: YES
-- بعد از ساخت، این policy را اضافه کنید:

-- Policy برای خواندن (همه می‌توانند ببینند — public bucket)
-- این به‌صورت خودکار برای public bucket فعال است

-- Policy برای آپلود (فقط authenticated با service_role)
-- این از طریق API با service_role key انجام می‌شود

SELECT column_name FROM information_schema.columns
WHERE table_name = 'transactions'
AND column_name = 'receipt_url';
