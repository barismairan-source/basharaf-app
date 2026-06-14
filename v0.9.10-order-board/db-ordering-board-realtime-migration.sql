-- db-ordering-board-realtime-migration.sql
-- Box 3: /orders staff board — adds orders/order_lines/order_events to
-- supabase_realtime publication so new orders + status changes push live.
-- Idempotent; safe to re-run; no-op on Liara (no publication).

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  ALTER PUBLICATION supabase_realtime ADD TABLE order_lines;
  ALTER PUBLICATION supabase_realtime ADD TABLE order_events;
EXCEPTION WHEN others THEN
  -- روی Liara یا اگر publication نیست، رد شو
  NULL;
END $$;
