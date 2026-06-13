-- db-menu-channel-migration.sql
-- Menu module: hall (in-restaurant) vs takeaway display channels.
-- Run once in pgAdmin. All statements are idempotent.

-- ===== menu_items =====

ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS in_hall boolean NOT NULL DEFAULT true;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS in_takeaway boolean NOT NULL DEFAULT false;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS price_takeaway bigint;

-- Allow items without a price (price omitted / shown without amount)
ALTER TABLE menu_items ALTER COLUMN price DROP NOT NULL;

-- ===== menu_settings =====

ALTER TABLE menu_settings ADD COLUMN IF NOT EXISTS show_price_hall boolean NOT NULL DEFAULT true;
ALTER TABLE menu_settings ADD COLUMN IF NOT EXISTS show_price_takeaway boolean NOT NULL DEFAULT true;
ALTER TABLE menu_settings ADD COLUMN IF NOT EXISTS takeaway_slug text NOT NULL DEFAULT 'birun';
ALTER TABLE menu_settings ADD COLUMN IF NOT EXISTS hall_title text;
ALTER TABLE menu_settings ADD COLUMN IF NOT EXISTS takeaway_title text;
ALTER TABLE menu_settings ADD COLUMN IF NOT EXISTS hall_note text;
ALTER TABLE menu_settings ADD COLUMN IF NOT EXISTS takeaway_note text;
