-- ═══════════════════════════════════════════════════════════════════
--  ایندکس‌های جدول transactions — گزارش بررسی ۲۰۲۶-۱۰، بند P3 (فقط سرعت).
--  گزارش‌ها روی بازه‌ی تاریخ (status + date) و دفتر صندوق/طرف‌حساب روی
--  account_id / destination_account_id / contact_id فیلتر می‌کنند؛ هیچ‌کدام ایندکس
--  نداشتند. کد به این ایندکس‌ها وابسته نیست — اجرا اختیاری است ولی توصیه می‌شود.
--
--  CONCURRENTLY: جدول هنگام ساخت قفل نمی‌شود (برنامه بدون وقفه کار می‌کند).
--  ⚠️ هر دستور را جدا اجرا کنید (CONCURRENTLY داخل BEGIN/COMMIT مجاز نیست).
--  Idempotent — اجرای چندباره امن است.
-- ═══════════════════════════════════════════════════════════════════

CREATE INDEX CONCURRENTLY IF NOT EXISTS tx_status_date_idx ON transactions (status, date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS tx_account_idx ON transactions (account_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS tx_dest_account_idx ON transactions (destination_account_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS tx_contact_idx ON transactions (contact_id);

-- بازگشت:
-- DROP INDEX CONCURRENTLY IF EXISTS tx_status_date_idx;
-- DROP INDEX CONCURRENTLY IF EXISTS tx_account_idx;
-- DROP INDEX CONCURRENTLY IF EXISTS tx_dest_account_idx;
-- DROP INDEX CONCURRENTLY IF EXISTS tx_contact_idx;
