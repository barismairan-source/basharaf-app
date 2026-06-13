-- db-operations-migration.sql
-- Operations module: purchase orders, equipment, maintenance, tasks
-- Run once in pgAdmin after db-inventory-reversal.sql has been applied.
-- All statements are idempotent (IF NOT EXISTS / DO-EXCEPTION blocks).

-- ===== ENUMS =====

DO $$ BEGIN
  CREATE TYPE po_status AS ENUM ('draft', 'sent', 'partial', 'received', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE equipment_status AS ENUM ('active', 'maintenance', 'retired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE maint_type AS ENUM ('preventive', 'corrective', 'inspection');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('pending', 'done', 'skipped');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===== purchase_orders =====
-- Three-way match: PO <-> inv_voucher (GRN) <-> transaction (payment)

CREATE TABLE IF NOT EXISTS purchase_orders (
  id                 uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  no                 text         NOT NULL,
  branch_id          uuid         NOT NULL REFERENCES branches(id)      ON DELETE RESTRICT,
  supplier_id        uuid                  REFERENCES contacts(id)      ON DELETE SET NULL,
  status             po_status    NOT NULL DEFAULT 'draft',
  expected_date      text,
  note               text         NOT NULL DEFAULT '',
  est_total          bigint       NOT NULL DEFAULT 0,
  final_total        bigint,
  ref_transaction_id uuid                  REFERENCES transactions(id)  ON DELETE SET NULL,
  ref_inv_voucher_id uuid                  REFERENCES inv_vouchers(id)  ON DELETE SET NULL,
  created_by         uuid                  REFERENCES users(id)         ON DELETE SET NULL,
  created_at         timestamptz  NOT NULL DEFAULT NOW(),
  updated_at         timestamptz  NOT NULL DEFAULT NOW()
);

ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS received_by uuid REFERENCES users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS po_branch_no_uidx  ON purchase_orders (branch_id, no);
CREATE        INDEX IF NOT EXISTS po_branch_idx      ON purchase_orders (branch_id);
CREATE        INDEX IF NOT EXISTS po_supplier_idx    ON purchase_orders (supplier_id);
CREATE        INDEX IF NOT EXISTS po_status_idx      ON purchase_orders (status);

-- ===== purchase_order_items =====
-- inventory_item_id is a real FK to inv_items; SET NULL if item is deleted

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          uuid          NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  inventory_item_id uuid                   REFERENCES inv_items(id)       ON DELETE SET NULL,
  description       text          NOT NULL DEFAULT '',
  qty               numeric(16,4) NOT NULL DEFAULT 0,
  unit_cost         bigint        NOT NULL DEFAULT 0,
  total_cost        bigint        NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS poi_order_idx  ON purchase_order_items (order_id);
CREATE INDEX IF NOT EXISTS poi_item_idx   ON purchase_order_items (inventory_item_id);

-- ===== equipment =====

CREATE TABLE IF NOT EXISTS equipment (
  id              uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id       uuid              NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  code            text              NOT NULL,
  name            text              NOT NULL,
  category        text              NOT NULL DEFAULT 'general',
  status          equipment_status  NOT NULL DEFAULT 'active',
  purchase_date   text,
  purchase_cost   bigint            NOT NULL DEFAULT 0,
  warranty_expiry text,
  note            text,
  created_at      timestamptz       NOT NULL DEFAULT NOW(),
  updated_at      timestamptz       NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS equipment_branch_code_uidx ON equipment (branch_id, code);
CREATE        INDEX IF NOT EXISTS equipment_branch_idx       ON equipment (branch_id);
CREATE        INDEX IF NOT EXISTS equipment_status_idx       ON equipment (status);

-- ===== maintenance_logs =====

CREATE TABLE IF NOT EXISTS maintenance_logs (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id       uuid        NOT NULL REFERENCES equipment(id)    ON DELETE CASCADE,
  type               maint_type  NOT NULL DEFAULT 'preventive',
  date               text        NOT NULL,
  cost               bigint      NOT NULL DEFAULT 0,
  vendor             text,
  note               text        NOT NULL DEFAULT '',
  ref_transaction_id uuid                 REFERENCES transactions(id) ON DELETE SET NULL,
  created_by         uuid                 REFERENCES users(id)        ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mlog_equipment_idx ON maintenance_logs (equipment_id);
CREATE INDEX IF NOT EXISTS mlog_date_idx      ON maintenance_logs (date);

-- ===== task_templates =====
-- branch_id nullable: NULL means template applies to all branches

CREATE TABLE IF NOT EXISTS task_templates (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id         uuid                 REFERENCES branches(id) ON DELETE SET NULL,
  title             text        NOT NULL,
  category          text        NOT NULL DEFAULT 'ops',
  assigned_role     text        NOT NULL DEFAULT 'BranchUser',
  frequency         text        NOT NULL DEFAULT 'daily',
  estimated_minutes integer     NOT NULL DEFAULT 0,
  checklist_json    jsonb,
  is_active         boolean     NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT NOW(),
  updated_at        timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tmpl_branch_idx ON task_templates (branch_id);
CREATE INDEX IF NOT EXISTS tmpl_active_idx ON task_templates (is_active);

-- ===== task_instances =====

CREATE TABLE IF NOT EXISTS task_instances (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id      uuid                 REFERENCES task_templates(id) ON DELETE SET NULL,
  branch_id        uuid        NOT NULL REFERENCES branches(id)       ON DELETE RESTRICT,
  assigned_user_id uuid                 REFERENCES users(id)          ON DELETE SET NULL,
  due_date         text        NOT NULL,
  completed_at     timestamptz,
  status           task_status NOT NULL DEFAULT 'pending',
  note             text,
  created_at       timestamptz NOT NULL DEFAULT NOW(),
  updated_at       timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tinst_branch_idx   ON task_instances (branch_id);
CREATE INDEX IF NOT EXISTS tinst_template_idx ON task_instances (template_id);
CREATE INDEX IF NOT EXISTS tinst_status_idx   ON task_instances (status);
CREATE INDEX IF NOT EXISTS tinst_due_idx      ON task_instances (due_date);

-- ===== Seed: expense category =====

INSERT INTO categories (id, type, name)
SELECT gen_random_uuid(), 'expense', 'خرید مواد اولیه'
WHERE NOT EXISTS (
  SELECT 1 FROM categories WHERE name = 'خرید مواد اولیه' AND type = 'expense'
);
