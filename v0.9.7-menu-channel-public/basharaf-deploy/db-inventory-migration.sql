-- ═══════════════════════════════════════════════════════════════════
--  Migration: ماژول انبار، آشپزخانه و کنترل هزینه (Inventory)
--  در Supabase SQL Editor اجرا شود. Idempotent (قابل اجرای مجدد).
--  هنگام prompt مربوط به RLS: "Run without RLS" (سیستم JWT خودش دارد).
--
--  ترتیب: بعد از supabase-v4-menu-migration.sql
--  هیچ جدول هسته‌ای تغییر نمی‌کند؛ فقط ۷ جدول inv_* + ۵ enum اضافه می‌شود.
-- ═══════════════════════════════════════════════════════════════════

-- ─── Enums (idempotent) ───
DO $$ BEGIN
  CREATE TYPE inv_item_kind AS ENUM ('raw','prep');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE inv_voucher_kind AS ENUM ('in','out','waste','sale','produce','stocktake');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE inv_voucher_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE inv_unit AS ENUM ('kg','g','L','ml','pcs','can','pack');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE inv_cook_mode AS ENUM ('daily','batch');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── inv_items ───
CREATE TABLE IF NOT EXISTS inv_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code             text NOT NULL,
  name             text NOT NULL,
  category         text NOT NULL DEFAULT 'سایر',
  kind             inv_item_kind NOT NULL DEFAULT 'raw',
  branch_id        uuid REFERENCES branches(id) ON DELETE RESTRICT,
  unit             inv_unit NOT NULL DEFAULT 'kg',
  base_per_unit    numeric(14,4) NOT NULL DEFAULT 1000,
  yield_pct        numeric(5,2)  NOT NULL DEFAULT 100,
  qty_physical     numeric(16,4) NOT NULL DEFAULT 0,
  qty_base         numeric(16,4) NOT NULL DEFAULT 0,
  avg_cost_per_base numeric(18,6) NOT NULL DEFAULT 0,
  min_base         numeric(16,4) NOT NULL DEFAULT 0,
  batch_yield_base numeric(16,4),
  shelf_life_days  integer NOT NULL DEFAULT 1,
  prep_recipe      jsonb,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS inv_items_branch_code_uniq ON inv_items(branch_id, code);
CREATE INDEX IF NOT EXISTS inv_items_kind_idx   ON inv_items(kind);
CREATE INDEX IF NOT EXISTS inv_items_branch_idx ON inv_items(branch_id);
CREATE INDEX IF NOT EXISTS inv_items_active_idx ON inv_items(is_active);

-- ─── inv_recipes ───
CREATE TABLE IF NOT EXISTS inv_recipes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  branch_id       uuid REFERENCES branches(id) ON DELETE RESTRICT,
  portions        integer NOT NULL DEFAULT 1,
  target_fc_pct   numeric(5,2) NOT NULL DEFAULT 30,
  price           bigint NOT NULL DEFAULT 0,
  cook_mode       inv_cook_mode NOT NULL DEFAULT 'daily',
  shelf_life_days integer NOT NULL DEFAULT 1,
  menu_item_id    uuid REFERENCES menu_items(id) ON DELETE SET NULL,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inv_recipes_branch_idx ON inv_recipes(branch_id);
CREATE INDEX IF NOT EXISTS inv_recipes_active_idx ON inv_recipes(is_active);

-- ─── inv_recipe_lines ───
CREATE TABLE IF NOT EXISTS inv_recipe_lines (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id    uuid NOT NULL REFERENCES inv_recipes(id) ON DELETE CASCADE,
  item_id      uuid NOT NULL REFERENCES inv_items(id) ON DELETE RESTRICT,
  qty_base     numeric(16,4) NOT NULL,
  override_pct numeric(5,2)
);
CREATE INDEX IF NOT EXISTS inv_recipe_lines_recipe_idx ON inv_recipe_lines(recipe_id);
CREATE INDEX IF NOT EXISTS inv_recipe_lines_item_idx   ON inv_recipe_lines(item_id);

-- ─── inv_vouchers ───
CREATE TABLE IF NOT EXISTS inv_vouchers (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  no                    text NOT NULL,
  kind                  inv_voucher_kind NOT NULL,
  status                inv_voucher_status NOT NULL DEFAULT 'pending',
  branch_id             uuid REFERENCES branches(id) ON DELETE RESTRICT,
  est_total             bigint NOT NULL DEFAULT 0,
  final_total           bigint,
  note                  text NOT NULL DEFAULT '',
  sale_meta             jsonb,
  created_by            uuid REFERENCES users(id) ON DELETE SET NULL,
  maker_date            text NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  approved_by           uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_at           timestamptz,
  rejected_by           uuid REFERENCES users(id) ON DELETE SET NULL,
  rejected_at           timestamptz,
  rejection_reason      text,
  linked_transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS inv_vouchers_branch_no_uniq    ON inv_vouchers(branch_id, no);
CREATE INDEX IF NOT EXISTS inv_vouchers_status_idx        ON inv_vouchers(status);
CREATE INDEX IF NOT EXISTS inv_vouchers_kind_idx          ON inv_vouchers(kind);
CREATE INDEX IF NOT EXISTS inv_vouchers_branch_status_idx ON inv_vouchers(branch_id, status);

-- ─── inv_voucher_lines ───
CREATE TABLE IF NOT EXISTS inv_voucher_lines (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id      uuid NOT NULL REFERENCES inv_vouchers(id) ON DELETE CASCADE,
  item_id         uuid NOT NULL REFERENCES inv_items(id) ON DELETE RESTRICT,
  qty_base        numeric(16,4) NOT NULL,
  est_unit_cost   numeric(18,6) NOT NULL DEFAULT 0,
  final_unit_cost numeric(18,6)
);
CREATE INDEX IF NOT EXISTS inv_voucher_lines_voucher_idx ON inv_voucher_lines(voucher_id);
CREATE INDEX IF NOT EXISTS inv_voucher_lines_item_idx    ON inv_voucher_lines(item_id);

-- ─── inv_stock_tx ───
CREATE TABLE IF NOT EXISTS inv_stock_tx (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     uuid NOT NULL REFERENCES inv_items(id) ON DELETE CASCADE,
  voucher_id  uuid REFERENCES inv_vouchers(id) ON DELETE SET NULL,
  kind        inv_voucher_kind NOT NULL,
  delta_base  numeric(16,4) NOT NULL,
  value       bigint NOT NULL DEFAULT 0,
  note        text NOT NULL DEFAULT '',
  jalali_date text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inv_stock_tx_item_idx    ON inv_stock_tx(item_id);
CREATE INDEX IF NOT EXISTS inv_stock_tx_created_idx ON inv_stock_tx(created_at);

-- ─── inv_daily_sales ───
CREATE TABLE IF NOT EXISTS inv_daily_sales (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id    uuid REFERENCES inv_vouchers(id) ON DELETE SET NULL,
  branch_id     uuid REFERENCES branches(id) ON DELETE RESTRICT,
  jalali_date   text NOT NULL,
  lines         jsonb NOT NULL,
  total_cogs    bigint NOT NULL DEFAULT 0,
  total_revenue bigint NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inv_daily_sales_branch_date_idx ON inv_daily_sales(branch_id, jalali_date);

-- ═══════════════════════════════════════════════════════════════════
--  پایان migration انبار. برای تست سریع می‌توانید چند ردیف seed بزنید
--  (اختیاری — حذف کنید اگر نمی‌خواهید):
-- ═══════════════════════════════════════════════════════════════════
-- INSERT INTO inv_items (code,name,category,kind,unit,base_per_unit,yield_pct,qty_base,qty_physical,avg_cost_per_base,min_base)
-- VALUES ('MEAT-01','گوشت گوسفند','پروتئین','raw','kg',1000,78,5000,5000,850,2000)
-- ON CONFLICT DO NOTHING;
