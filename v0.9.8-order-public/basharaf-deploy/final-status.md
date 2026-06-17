# Batch 3 — Extended Audit & Execution Report (Autonomous Run)

## PART 1 — Architectural Audit

### 1. Intermediate Waste/Yield (compounding through prep-of-prep)
**Status: confirmed correct (fixed earlier in this batch).**
`resolvePrepCostChain` in `lib/inventory/costing.ts` now uses
`line.overridePct ?? childPrep.yieldPct ?? 100` for nested-prep lines (was
`?? 100`, dropping the child prep's own intrinsic waste). Waste now compounds
correctly: raw → nested prep → final dish. No "Ghost Inventory" — every gram
consumed is accounted for at every layer. No further action needed.

### 2. Waste Accounting — GAP FOUND, FIXED
The `inv_vouchers.kind = 'waste'` flow already existed at the *inventory* layer
(`approveVoucherTx` issues stock at WAC, decrementing `qtyBase`/value — i.e.
"credit Inventory"), but it **never posted to the GL** — spoiled stock vanished
from the books with no expense recorded ("debit Waste Expense" was missing).

**Fix:** added `postWasteToAccounting()` to `lib/inventory/postToAccounting.ts`,
mirroring `postPurchaseToAccounting`/`postSaleToAccounting` (idempotent via
`linkedTransactionId`, wrapped in the same `db.transaction`). It inserts a
system `expense` transaction, category **"ضایعات انبار (Waste Expense)"**,
`accountId: null` (non-cash — spoilage doesn't move cash, it writes off an
asset already credited by `issueConfirmed`; exactly the same accounting
shape as the COGS entry from Step 3). Wired into
`app/api/inventory/vouchers/[id]/approve/route.ts` for `kind === 'waste'`.//
Net effect: Inventory (asset) ↓ via WAC issue, Waste Expense ↑ via this
transaction — books and shelves now agree.

### 3. Price Volatility / WAC — confirmed + auto-recompute added
**WAC mechanism (existing, confirmed correct):** `receiveConfirmed` in
`lib/db/inventoryHelpers.ts` implements textbook weighted-average costing:
`newAvg = (oldQty*oldAvg + totalCost) / (oldQty+qtyBase)`. Every confirmed
receipt (`in`, `produce`, `stocktake` surplus) recomputes it.

**GAP FOUND:** when a purchase voucher (`kind='in'`) is approved at a new unit
price, `avgCostPerBase` of the *raw* item changes — but every `prep` whose BOM
(directly or transitively) contains that raw item keeps its stale
`avgCostPerBase` until someone manually hits "recost". This causes silently
wrong recipe costing/food-cost % after every price swing.

**Fix:** added `autoRecostAffectedPreps()` to `lib/inventory/costing.ts` —
reuses the existing `resolvePrepCostChain`/`chainPersistOrder` (no duplicate
logic). After a purchase voucher is approved, it loads every `prep` item in the
voucher's branch (+ branch-less/global preps), resolves each chain bottom-up,
and persists `avgCostPerBase` for any prep whose recomputed cost actually
changed — exactly the same persist order/safety as the manual `recost` route.
Wired into the `kind === 'in'` branch of the voucher-approve route, inside the
same `db.transaction`.

### 4. Expiry & Traceability — schema extended (FIFO groundwork)
`inv_items.code` already serves as the unique SKU/Item Code (per-branch unique
index `inv_items_branch_code_uniq`) — no change needed there.

**Expiry date tracking did not exist anywhere.** Added a nullable
`expiry_date` (Jalali date string) column to **`inv_voucher_lines`** (captured
at receipt time by the warehouse maker) and to **`inv_stock_tx`** (carried into
the ledger so every movement is traceable to a batch/expiry). Migration:
`supabase-v6-waste-expiry-migration.sql`.

**Design decision — WAC retained, FIFO deferred (documented per "ambiguity →
ERP-standard path" rule):** Switching the live costing engine from
weighted-average to full FIFO lot tracking would require a new `inv_stock_lots`
table, lot-consumption ledger, and a rewrite of `issueConfirmed`/
`receiveConfirmed` — a major schema migration that cannot be safely authored,
let alone tested, without a live database connection (per the standing
constraint of this session). The pragmatic, professional middle path —
recording `expiryDate` on every receipt line and ledger entry now — gives the
business immediate expiry-alerting/traceability value and is the natural
foundation for a future FIFO migration, without destabilizing the
already-correct, already-tested WAC engine mid-batch.

---

## PART 2 — Execution Summary
All four findings above were implemented:
1. (no-op — already fixed)
2. `postWasteToAccounting` + wiring
3. `autoRecostAffectedPreps` + wiring
4. `expiry_date` columns + migration `supabase-v6-waste-expiry-migration.sql`

All changes wrapped in the existing `db.transaction` blocks; no ledger bypass;
reused `applyBalance`/`postPurchaseToAccounting` family helpers — no duplicate
accounting logic introduced.

Verified: `npx tsc --noEmit` → 0 errors · `npm run build` → ✓ Compiled successfully.

See `deployment-summary.md` for the full file-by-file change list.
