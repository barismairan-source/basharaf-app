-- ایندکس اختیاری برای بهبود کارایی گزارش واریانس در نمای «فروش واقعی»
-- جلسه: 2026-06-30 — شکاف ۳ variance
--
-- چه وقت اجرا کن؟
--   اگر گزارش واریانس-daily روی بازه‌های بزرگ (> ۱ ماه) کند بود.
--   در محیط production اجرا کن (pgAdmin / psql).
--
-- CONCURRENTLY: بدون lock روی جدول — در production ایمن است.

CREATE INDEX CONCURRENTLY IF NOT EXISTS inv_stock_tx_item_date_idx
  ON inv_stock_tx (item_id, jalali_date);
