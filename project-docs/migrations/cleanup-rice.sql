-- ============================================================================
-- cleanup-rice.sql
--
-- Manual reset for the corrupted "Rice" inventory item (code = 'R-002') so it
-- can be tested again from a clean slate after the supabase-v7-bigint-migration
-- has widened the unit-cost columns (avg_cost_per_base / est_unit_cost /
-- final_unit_cost) from numeric(18,6) to numeric(24,6).
--
-- Resets:
--   qty_base          -> 0   (definitive/approved on-hand quantity)
--   avg_cost_per_base -> 0   (corrupted weighted-average cost, was 65,500,000,000)
--
-- NOTE: qty_physical (the "physical" layer touched immediately on voucher
-- submission, before accountant approval) is intentionally left untouched by
-- default — uncomment the line below if you also want to zero it out.
--
-- Idempotent / safe to re-run.
-- Run in the Supabase SQL Editor / pgAdmin (no RLS, matches project convention).
-- ============================================================================

update inv_items
set
  qty_base          = 0,
  avg_cost_per_base = 0,
  -- qty_physical   = 0,   -- uncomment to also reset the physical layer
  updated_at        = now()
where code = 'R-002';

-- Verify the reset:
select id, code, name, qty_physical, qty_base, avg_cost_per_base, updated_at
from inv_items
where code = 'R-002';
