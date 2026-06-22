# Batch 3 — Deployment Summary (Inventory Segregation of Duties & Recipe Engine)

Full audit notes are in `final-status.md`. This file is the file-by-file change
log for the milestone.

## Step 1 — Segregation of Duties (Warehouse vs. Accounting)
- `lib/auth/permissions.ts` — new capability `inventory.viewCosts`
  (default roles: SuperAdmin, BranchUser — Warehouse excluded by default)
- `lib/db/inventory.serializers.ts` — `rowToInvItem`/`rowToInvVoucher` accept a
  `maskCosts` flag; nulls `avgCostPerBase`, `estTotal`, `finalTotal`,
  `estUnitCost`, `finalUnitCost`
- `app/api/inventory/items/route.ts`, `app/api/inventory/vouchers/route.ts` —
  GET/POST mask financial fields server-side based on `canDo(.., 'inventory.viewCosts')`
- `app/api/inventory/items/[id]/recost/route.ts`,
  `app/api/inventory/recipes/[id]/costing/route.ts` — 403 guard requiring
  `inventory.viewCosts`
- `app/(app)/inventory/page.tsx` — UI cost columns gated by the same capability
  (defense-in-depth: masked server- and client-side)

## Step 2 — Recipe Yield/Waste (compounding fix)
- `lib/inventory/costing.ts` — `PrepNode.yieldPct` added; `resolvePrepCostChain`
  fallback corrected to `line.overridePct ?? childPrep.yieldPct ?? 100` so waste
  compounds correctly across multi-layer prep chains
- `app/api/inventory/items/[id]/recost/route.ts` — populates `yieldPct` when
  building `prepsById`

## Step 3 — Menu → Inventory Auto-Deduction (Backflushing)
- `lib/db/schema.ts` — `transactions.saleMeta` (jsonb)
- `supabase-v5-menu-sale-deduction-migration.sql` — adds `sale_meta` column
- `lib/inventory/menuSaleDeduction.ts` (new) — `applyMenuSaleDeduction()`:
  explodes menu-item recipe BOM (yield-aware), issues stock at WAC via
  `issueConfirmed`, writes `inv_stock_tx` ledger rows (`kind='sale'`), inserts
  `inv_daily_sales` aggregate
- `app/api/transactions/[id]/approve/route.ts` — hooked into income-transaction
  approval: detects `saleMeta.lines`, runs deduction inside the existing
  `db.transaction`, auto-creates a system COGS expense transaction, and stamps
  `saleMeta.deductedAt` + `cogsTransactionId` for idempotency

## Extended audit fixes (this run)
1. **Compounding waste** — confirmed correct (Step 2 fix already covers it).
2. **Waste accounting (GL gap closed)**
   - `lib/inventory/postToAccounting.ts` — new `postWasteToAccounting()`:
     idempotent (via `linkedTransactionId`), posts a system `expense`
     transaction (`categoryName: 'ضایعات انبار (Waste Expense)'`,
     `accountId: null` — non-cash, mirrors the COGS posting pattern)
   - `app/api/inventory/vouchers/[id]/approve/route.ts` — wired in for
     `kind === 'waste'`, inside the existing `db.transaction`
3. **WAC price-volatility auto-recompute**
   - `lib/inventory/costing.ts` — new pure function `computeAutoRecost()`
     (reuses `resolvePrepCostChain`/`chainPersistOrder`, no duplicated logic);
     returns only the preps whose `avgCostPerBase` actually changed
   - `app/api/inventory/vouchers/[id]/approve/route.ts` — after a purchase
     voucher (`kind === 'in'`) is approved and raw-item WAC updates, loads all
     branch items, calls `computeAutoRecost`, and persists changed prep costs —
     atomically, in the same `db.transaction`, before the GL posting
4. **Expiry & traceability (FIFO groundwork)**
   - `lib/db/schema.ts` — `expiry_date` (text/Jalali, nullable) added to
     `inv_voucher_lines` and `inv_stock_tx`
   - `supabase-v6-waste-expiry-migration.sql` — migration for both columns
   - `app/api/inventory/vouchers/route.ts` — accepts optional `expiryDate` per
     line on voucher creation
   - `app/api/inventory/vouchers/[id]/approve/route.ts` — propagates
     `expiryDate` from the voucher line into the `inv_stock_tx` ledger entry
   - `lib/db/inventory.serializers.ts` — exposes `expiryDate` on voucher lines
     (quantity/traceability data — visible to all roles, not masked)
   - SKU/Item Code: `inv_items.code` already serves this role (unique per
     branch) — no schema change needed
   - **Design note:** WAC retained as the live costing engine; full FIFO lot
     tracking would require a new lots table + ledger rewrite, which cannot be
     safely authored/tested without a live DB connection (standing constraint
     of this engagement). `expiryDate` capture is the pragmatic, ERP-standard
     foundation for a future FIFO migration without destabilizing the
     already-verified WAC engine mid-batch.

## New migration files (standalone SQL — no live DB to run `drizzle-kit` against)
- `supabase-v5-menu-sale-deduction-migration.sql`
- `supabase-v6-waste-expiry-migration.sql`

## Verification
- `npx tsc --noEmit` → **0 errors**
- `npm run build` → **✓ Compiled successfully**

## Branch / VCS
All changes are local working-tree modifications on the current branch (no
commit was made — per the standing rule that commits/deploys happen only on
your explicit go-ahead at milestone completion).
