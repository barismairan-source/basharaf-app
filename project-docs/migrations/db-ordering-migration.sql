-- db-ordering-migration.sql
-- Ordering module: takeaway service (delivery + pickup, cash + online, guest checkout).
-- Catalog = existing menu_items (in_takeaway channel). Data + settings only, no customer UI yet.
-- Run once in pgAdmin. All statements are idempotent.
-- No enums (per project convention) - service_type/pay_method/pay_status are
-- text with inline CHECK constraints; status/booleans/money follow text+check/boolean/bigint.

-- ===== ord_settings =====
-- One row per branch: takeaway ordering configuration.

CREATE TABLE IF NOT EXISTS ord_settings (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id        uuid        NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  is_open          boolean     NOT NULL DEFAULT true,
  open_time        text        NOT NULL DEFAULT '09:00',
  close_time       text        NOT NULL DEFAULT '23:00',
  delivery_enabled boolean     NOT NULL DEFAULT true,
  pickup_enabled   boolean     NOT NULL DEFAULT true,
  pay_cash         boolean     NOT NULL DEFAULT true,
  pay_online       boolean     NOT NULL DEFAULT false,
  min_order        bigint      NOT NULL DEFAULT 0,
  prep_buffer_min  integer     NOT NULL DEFAULT 30,
  created_at       timestamptz NOT NULL DEFAULT NOW(),
  updated_at       timestamptz NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ord_settings_branch_uidx ON ord_settings (branch_id);

-- ===== ord_zones =====
-- Named delivery zones with their own delivery fee + minimum order.

CREATE TABLE IF NOT EXISTS ord_zones (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id    uuid        NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  name         text        NOT NULL,
  delivery_fee bigint      NOT NULL,
  min_order    bigint      NOT NULL DEFAULT 0,
  is_active    boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT NOW(),
  updated_at   timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ord_zones_branch_idx ON ord_zones (branch_id);

-- ===== orders =====
-- service_type/pay_method/pay_status use CHECK constraints (no pgEnum).
-- status is a plain text column for now (state machine TBD); order_events
-- keeps an append-only history of every status transition.

CREATE TABLE IF NOT EXISTS orders (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id      uuid        NOT NULL REFERENCES branches(id)  ON DELETE RESTRICT,
  order_no       text        NOT NULL,
  track_token    text        NOT NULL,
  service_type   text        NOT NULL CHECK (service_type IN ('delivery', 'pickup')),
  status         text        NOT NULL DEFAULT 'received',
  customer_name  text        NOT NULL,
  customer_phone text        NOT NULL,
  address        text,
  zone_id        uuid                 REFERENCES ord_zones(id) ON DELETE SET NULL,
  subtotal       bigint      NOT NULL,
  delivery_fee   bigint      NOT NULL DEFAULT 0,
  discount       bigint      NOT NULL DEFAULT 0,
  total          bigint      NOT NULL,
  pay_method     text        NOT NULL CHECK (pay_method IN ('cash', 'online')),
  pay_status     text        NOT NULL DEFAULT 'unpaid' CHECK (pay_status IN ('unpaid', 'paid', 'failed', 'refunded')),
  pay_ref        text,
  pickup_time    text,
  client_token   text,
  jalali_date    text        NOT NULL,
  note           text,
  created_at     timestamptz NOT NULL DEFAULT NOW(),
  updated_at     timestamptz NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS orders_order_no_uidx     ON orders (order_no);
CREATE UNIQUE INDEX IF NOT EXISTS orders_track_token_uidx  ON orders (track_token);
CREATE UNIQUE INDEX IF NOT EXISTS orders_client_token_uidx ON orders (client_token);
CREATE        INDEX IF NOT EXISTS orders_branch_status_idx ON orders (branch_id, status);

-- ===== order_lines =====
-- Snapshot of item name + unit price at order time (menu_items may change later).

CREATE TABLE IF NOT EXISTS order_lines (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   uuid        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_name  text        NOT NULL,
  unit_price bigint      NOT NULL,
  qty        integer     NOT NULL,
  line_total bigint      NOT NULL
);

CREATE INDEX IF NOT EXISTS order_lines_order_idx ON order_lines (order_id);

-- ===== order_events =====
-- Append-only history of status transitions.

CREATE TABLE IF NOT EXISTS order_events (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status   text,
  to_status     text        NOT NULL,
  actor_user_id uuid                 REFERENCES users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS order_events_order_idx ON order_events (order_id);
