-- Migration: جلوگیری از برگه‌ی معکوس تکراری برای یک برگه‌ی مادر
-- این index تنها روی ردیف‌هایی که parent_voucher_id دارند اعمال می‌شود (partial index).
-- اجرا با CONCURRENTLY: جدول را قفل نمی‌کند — در production بدون downtime قابل اجراست.
-- پیش‌نیاز: باید خارج از یک transaction بلوک اجرا شود (CONCURRENTLY این محدودیت را دارد).

-- =========================================================
-- Up
-- =========================================================
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uq_inv_vouchers_parent_voucher_id
  ON inv_vouchers (parent_voucher_id)
  WHERE parent_voucher_id IS NOT NULL;

-- =========================================================
-- Down (reversible)
-- =========================================================
-- DROP INDEX IF EXISTS uq_inv_vouchers_parent_voucher_id;

-- =========================================================
-- یادداشت برای اجرا در production
-- =========================================================
-- ۱. این دستور را در یک psql session مستقل اجرا کنید (نه داخل BEGIN/COMMIT).
-- ۲. روی جداول بزرگ ممکن است چند ثانیه طول بکشد — در طول این مدت
--    INSERT/UPDATE همچنان کار می‌کند (CONCURRENTLY قفل ACCESS EXCLUSIVE نمی‌گیرد).
-- ۳. اگر index‌سازی نیمه‌کاره بماند (crash)، یک ردیف با state INVALID در
--    pg_indexes ظاهر می‌شود. با DROP INDEX آن را حذف و دوباره اجرا کنید.
-- ۴. قبل از اجرا، موارد تکراری را بررسی کنید:
--      SELECT parent_voucher_id, COUNT(*)
--      FROM inv_vouchers
--      WHERE parent_voucher_id IS NOT NULL
--      GROUP BY parent_voucher_id HAVING COUNT(*) > 1;
--    اگر ردیفی برگشت → داده‌ی خراب وجود دارد؛ ابتدا آن را بررسی و پاک‌سازی کنید.
