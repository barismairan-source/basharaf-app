-- ─────────────────────────────────────────────────────────────────
-- فعال‌سازی Supabase Realtime — این را در SQL Editor اجرا کنید
-- ─────────────────────────────────────────────────────────────────
-- این دستورات باید فقط یک بار اجرا شوند.

-- فعال کردن realtime برای جدول transactions
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;

-- فعال کردن realtime برای جدول notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- بررسی اینکه درست اضافه شدند:
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
