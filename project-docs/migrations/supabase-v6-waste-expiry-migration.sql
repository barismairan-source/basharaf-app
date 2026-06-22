-- Batch 3 (extended) — Waste accounting GL gap + Expiry/Traceability groundwork
--
-- 1) ردیابی/انقضا (زمینه‌ساز FIFO آینده، بدون تغییر موتور WAC فعلی):
--    تاریخ انقضا روی خط برگه (هنگام ثبت توسط انباردار) و روی دفتر کل حرکت
--    موجودی (برای ردپای حسابرسی و هشدار انقضا) ثبت می‌شود.
--
-- نکته: postWasteToAccounting و autoRecostAffectedPreps (Part 1, items 2 و 3)
-- نیازی به تغییر اسکیمای پایگاه‌داده ندارند — فقط از جداول/ستون‌های موجود
-- (transactions, inv_items.avg_cost_per_base) استفاده می‌کنند.

ALTER TABLE inv_voucher_lines
  ADD COLUMN IF NOT EXISTS expiry_date text;

ALTER TABLE inv_stock_tx
  ADD COLUMN IF NOT EXISTS expiry_date text;

COMMENT ON COLUMN inv_voucher_lines.expiry_date IS
  'تاریخ انقضای محموله (رشته‌ی جلالی، اختیاری) — ثبت‌شده توسط انباردار هنگام دریافت. زمینه‌ساز FIFO/هشدار انقضا.';

COMMENT ON COLUMN inv_stock_tx.expiry_date IS
  'تاریخ انقضای محموله، منتقل‌شده از خط برگه به دفتر کل حرکت موجودی برای ردپای حسابرسی.';
