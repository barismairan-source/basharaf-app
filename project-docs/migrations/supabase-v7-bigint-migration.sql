-- ============================================================================
-- supabase-v7-bigint-migration.sql
--
-- ROOT CAUSE: submitting a 'waste' voucher for 2,000 units of an item whose
-- inv_items.avg_cost_per_base is corrupted (e.g. 65,500,000,000 toman/unit)
-- produces an issued cost of 2,000 x 65,500,000,000 = 131,000,000,000,000
-- (131 trillion). The unit-cost columns inv_items.avg_cost_per_base,
-- inv_voucher_lines.est_unit_cost and inv_voucher_lines.final_unit_cost were
-- declared as numeric(18,6) — only 12 integer digits (max ~999,999,999,999.999999).
-- Any write/derivation that lands a value >= 10^12 in one of these columns
-- raises a Postgres "numeric field overflow" error, which bubbles up as a
-- generic 500 ("INTERNAL_ERROR") and is shown to the user as a blind
-- "خطا در ثبت برگه" toast.
--
-- FIX: widen these unit-cost columns from numeric(18,6) to numeric(24,6)
-- (18 integer digits, max ~999,999,999,999,999,999.999999 — comfortably
-- covers the corrupted 131-trillion-toman case and any realistic future one).
-- All monetary TOTAL columns (est_total, final_total, value, total_cogs,
-- total_revenue, amount, ...) are already `bigint` (int8, max ~9.2 x 10^18)
-- and are NOT affected by this overflow — they only needed the upstream
-- unit-cost columns fixed so the multiplication can be performed/stored
-- without error in the first place.
--
-- Idempotent: every ALTER checks the column's current precision before
-- changing it, so re-running this file is always safe.
-- Run without RLS in the Supabase SQL Editor / pgAdmin (matches project convention).
-- ============================================================================

do $$
begin
  -- inv_items.avg_cost_per_base : numeric(18,6) -> numeric(24,6)
  if exists (
    select 1 from information_schema.columns
    where table_name = 'inv_items'
      and column_name = 'avg_cost_per_base'
      and numeric_precision = 18
  ) then
    alter table inv_items
      alter column avg_cost_per_base type numeric(24,6) using avg_cost_per_base::numeric(24,6);
  end if;

  -- inv_voucher_lines.est_unit_cost : numeric(18,6) -> numeric(24,6)
  if exists (
    select 1 from information_schema.columns
    where table_name = 'inv_voucher_lines'
      and column_name = 'est_unit_cost'
      and numeric_precision = 18
  ) then
    alter table inv_voucher_lines
      alter column est_unit_cost type numeric(24,6) using est_unit_cost::numeric(24,6);
  end if;

  -- inv_voucher_lines.final_unit_cost : numeric(18,6) -> numeric(24,6)
  if exists (
    select 1 from information_schema.columns
    where table_name = 'inv_voucher_lines'
      and column_name = 'final_unit_cost'
      and numeric_precision = 18
  ) then
    alter table inv_voucher_lines
      alter column final_unit_cost type numeric(24,6) using final_unit_cost::numeric(24,6);
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- Sanity check: confirm the new precisions. Expect 24 / scale 6 for all three.
-- ----------------------------------------------------------------------------
select table_name, column_name, numeric_precision, numeric_scale
from information_schema.columns
where (table_name, column_name) in (
  ('inv_items', 'avg_cost_per_base'),
  ('inv_voucher_lines', 'est_unit_cost'),
  ('inv_voucher_lines', 'final_unit_cost')
)
order by table_name, column_name;

-- ----------------------------------------------------------------------------
-- Defensive audit: list any monetary-sounding column that is still a plain
-- `integer` (int4, max ~2.1 billion) anywhere in the schema. None are expected
-- to show up — every total/amount/balance column in this project already uses
-- `bigint` — but this query is kept here so a future regression is caught
-- immediately by re-running this file.
-- ----------------------------------------------------------------------------
select table_name, column_name, data_type
from information_schema.columns
where data_type = 'integer'
  and (
    column_name ilike '%amount%' or column_name ilike '%total%' or
    column_name ilike '%price%'  or column_name ilike '%cost%'  or
    column_name ilike '%balance%' or column_name ilike '%value%' or
    column_name ilike '%spent%'  or column_name ilike '%revenue%'
  )
order by table_name, column_name;
