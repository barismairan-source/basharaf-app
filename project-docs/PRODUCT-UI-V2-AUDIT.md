# Product UI V2 — Final Audit

**Scope:** Dashboard, Transactions list, New Transaction form, Recruitment — audited together as one cross-page consistency pass, on top of the individual redesign phases already shipped. Branch: `feat/product-ui-v2`. Date: 2026-07-26.

**Method:** a full read-only inventory of every `PageHeader`/`PageToolbar`, `Button`/`IconButton`, `Input`/`Select`/`Textarea`, card-like container, money-formatting call site, and loading/empty/error state across the four pages and their direct sub-components, cross-checked by direct code reading (not paraphrase). Findings were split into **genuine, verified issues** (fixed here) and **false positives** (left alone, documented below). No new feature was added — every change in this pass is a fix to something the inventory could point to a specific file/line for.

---

## 1. Changed information architecture

None. This audit did not restructure any page's IA — every section, tab, filter, or panel introduced in the four individual redesign phases stays exactly where it was. The only structural change is the removal of one dead component (`components/dashboard/OperationsStrip.tsx`) that had already been fully superseded by `OperationalQueues` during the Dashboard phase but was never deleted — a duplicate-primitive cleanup, not an IA change.

## 2. Changed shared components / fixes applied

All fixes below were found by directly reading the flagged code, not by trusting a paraphrase — each is a specific, verifiable defect.

| # | Where | What was wrong | Fix |
|---|---|---|---|
| 1 | `app/(app)/dashboard/page.tsx` — "عملیاتی/کامل" toggle | Hand-rolled `<button>` pair duplicating what `SegFilter` already does, with no keyboard nav and no focus ring | Replaced with `<SegFilter>` (reuses the already-tested `nextRadioIndex` keyboard logic) |
| 2 | `app/(app)/dashboard/page.tsx` — partner cards | No `focus-visible` ring — keyboard users tabbing through couldn't see where focus was | Added the standard `focus-visible:ring-2 ring-accent/40 ring-offset-1` treatment |
| 3 | `app/(app)/dashboard/page.tsx` — `FinancialPosition`/`AttentionWidget`/`OperationalQueues`/`HRSummaryCard` | All three dashboard fetches (`loadReports`, `loadOverview`, `loadBranchCogsWaste`) caught errors silently (`.catch(() => {})`) and left the underlying state `null`. `FinancialPosition` returned `null` on `!data` and `OperationalQueues` did the same — a network failure made the entire financial-position section *and* the entire attention/queues/HR section vanish with no indication anything was wrong. Worse, `AttentionWidget`'s items are built with optional chaining (`overview?.finance.pendingTransactions`), so a failed fetch silently rendered as "nothing needs attention" — the most dangerous kind of silent failure for an operations dashboard. | Added `reportsError`/`overviewError` state, distinguished from intentional `AbortController` cancellation (filter changes mid-flight). `FinancialPosition` now renders an `InlineNotice` with a retry button on error instead of disappearing. A single shared `InlineNotice` above the "نیازمند توجه" section covers the three widgets fed by the same `/api/dashboard/overview` call, matching the fact that it's already one de-duplicated fetch. |
| 4 | `app/(app)/transactions/page.tsx` — desktop filter `Select`s (type/status/branch/sort) | `className="h-9 ..."` was passed to `<Select>`, but that prop lands on the *wrapping* `<div>`, not the `<select>` itself (which has its own hardcoded `h-11 sm:h-10`). The override did nothing to the select's actual rendered size, but it did shrink the wrapper the chevron icon is vertically centered against — the dropdown chevron sat ~2px off-center relative to the visually-taller select. | Removed the dead `h-9 text-[12px]` overrides, kept `min-w-[...]` (the only part that was doing anything). Selects now match every other `Select` in the app and the chevron is correctly centered. |
| 5 | `app/(app)/transactions/page.tsx` — advanced-filter date inputs (raw `<input>`) | `h-9` (shorter than every other field in the app) and `focus:outline-none focus:border-accent` with **no ring** — inconsistent with `Input.tsx`'s own focus style | Height → `h-10`; focus style → `focus:border-accent focus:ring-2 focus:ring-accent/40`, matching `Input.tsx` |
| 6 | `app/(app)/transactions/page.tsx` + `app/(app)/recruitment/page.tsx` + `components/recruitment/CandidateDetail.tsx` — 6 `Popover` menu items total | Raw `<button role="menuitem">` elements had no `focus-visible` ring and (5 of 6) no `type="button"` | Added both consistently across all 6 |
| 7 | `app/(app)/transactions/new/page.tsx` — "add category" modal | `bg-white` / `text-stone-900` hardcoded instead of the `bg-surface`/`text-text` tokens used everywhere else (including the *other* two modals built in the Recruitment phase); cancel button and name input had no visible focus ring | Switched to theme tokens; added `focus-visible`/`focus` ring treatment matching `Input.tsx` |
| 8 | `app/(app)/transactions/new/page.tsx` — URL-prefill amount handling | Used `new Intl.NumberFormat('fa-IR').format(n)` directly instead of the same `formatAmountInput()` the field's own `onChange` uses. `Intl.NumberFormat('fa-IR')` uses the Arabic thousands separator (٬); `formatAmountInput` (via `fmt()`) uses an ASCII comma — a prefilled amount would visibly re-format itself the moment the user touched the field. | Now calls `formatAmountInput(String(n))`, the same function the field already uses on every edit |
| 9 | `components/dashboard/OperationsStrip.tsx` | Dead file — fully superseded by `OperationalQueues` (built during the Dashboard redesign) but never deleted; not exported from `components/dashboard/index.ts`, not imported anywhere in live code (confirmed by grep across the whole repo, excluding old release snapshots) | Deleted |

### Findings investigated and NOT changed (false positives from the initial inventory pass)
- **"Missing aria-label" on several buttons** (dashboard partner cards, transactions print-menu-item, recruitment popover items): all of these have visible text content, so their accessible name is already correctly derived from that text per standard a11y rules — an explicit `aria-label` would be redundant, not corrective.
- **Transactions "metric filter trigger" button**: already had `type="button"` and a proper `focus-visible` ring; it's a legitimate wrapper making a non-interactive `MetricCard` clickable, not a duplicate of the `Button` component.
- **Modal `rounded-xl` vs the app's usual `rounded-lg`**: intentional — dialogs get a slightly larger radius across this whole design system, consistent between the transactions/new category modal and both recruitment modals.
- **`/api/anomaly/findings/counts` fetch inside `AttentionWidget`**: not a duplicate request — it's a separate, legitimately-scoped data source (anomaly counts, gated by its own permission check), fetched once, with its own cancellation guard.

## 3. Financial terminology decisions

No terminology changed in this pass — this section re-confirms the decisions already made and shipped in the individual phases, since the audit explicitly checked for drift:
- Income − expense over a period is always labeled **"جریان خالص دوره" / "روند خالص دوره"** (period net flow), never "موجودی" (balance) — checked on Dashboard and Transactions.
- Actual account balances (a stock, not a flow) are shown in a visually separate section explicitly labeled **"لحظه‌ای، مستقل از بازه‌ی انتخابی"** (real-time, independent of the selected period).
- All money values route through `lib/design/format.ts` (`formatSignedMoney`, `formatMoney`, `formatMoneyShort`, `formatMoneyParts`) — the one exception found (transactions/new prefill) is fixed above.
- `tabular-nums` (or the `.num` utility class, which sets the same `font-variant-numeric`) is applied to every numeric display checked: amounts, dates, scores, counts, pagination.

## 4. Accessibility verification

- **Contrast:** no new raw/arbitrary colors were introduced in this audit pass; every fix reuses existing semantic tokens (`text-danger`, `bg-danger-subtle`, `accent`, etc.) already vetted during the earlier WCAG 2.2 AA pass in the Product UI V2 foundation phase.
- **Focus visibility:** 8 interactive elements across the four pages were found with no `focus-visible` treatment (or a broken one) and fixed — see table above. Spot-checked the rest of the inventory; no further gaps found.
- **Keyboard flow:** grepped all four pages and their direct sub-components for `onClick` on non-button/non-role="button" elements; the only match (a modal backdrop `onClick` to close on click-outside) is intentionally non-focusable — Escape already closes the same modal, so no keyboard path is lost.
- **Reduced motion:** `app/globals.css` has a single `@media (prefers-reduced-motion: reduce)` rule targeting `*`/`*::before`/`*::after` that collapses all `animation-duration`/`transition-duration` to near-zero — this is inherited automatically by every class used in this audit (`animate-pulse`, `transition-colors`, etc.); no page-level override needed or found.
- **No hover-only functionality:** grepped for `group-hover`/`opacity-0 ... hover:opacity-100`/`invisible ... hover` patterns across all four pages and their sub-components — zero matches.

*Limitation, same as every prior phase in this project: there is no jsdom/browser test runner configured (vitest runs with `environment: 'node'`), so none of these are covered by automated component tests — verification here is direct code reading plus a console-error smoke check via the dev server, not a rendered accessibility tree.*

## 5. Responsive verification

- Grepped all four pages for fixed pixel widths (`min-w-[Npx]`, `w-[Npx]`) that could overflow at 390px — the few found (100–180px) sit inside `hidden md:flex` desktop-only rows or a `flex-wrap` container, so they don't apply at mobile widths.
- The Recruitment candidate grid (`auto-fit`/`minmax(360px,1fr)`) has an explicit `grid-cols-1` fallback below the `sm:` breakpoint, so it can't force overflow on a 390px viewport.
- `StickyActionBar` (New Transaction form) and the sticky table header (Transactions) were built with explicit safe-area math in earlier phases and were not touched in this audit; re-read to confirm no regression.
- Dev-server smoke check at 390×844, 768×1024 confirmed `document.documentElement.scrollWidth === clientWidth` (no horizontal overflow) on the reachable (login) page; the four target routes redirect to `/login` without a local database, the same limitation noted in every prior phase's journal entry — full authenticated verification at all four breakpoints (390/768/1440/1920) still needs a real login.

## 6. Performance comparison

Route bundle sizes, pre-Product-UI-V2 baseline (commit `cc87968`) vs. current (`feat/product-ui-v2` after this audit):

| Route | Before (route / First Load) | After (route / First Load) | Δ route | Δ First Load |
|---|---|---|---|---|
| `/dashboard` | 14.0 kB / 277 kB | 17.0 kB / 283 kB | +3.0 kB | +6 kB |
| `/transactions` | 12.0 kB / 195 kB | 14.9 kB / 200 kB | +2.9 kB | +5 kB |
| `/transactions/new` | 5.99 kB / 185 kB | 6.88 kB / 189 kB | +0.89 kB | +4 kB |
| `/recruitment` | 9.97 kB / 259 kB | 14.1 kB / 266 kB | +4.13 kB | +7 kB |

All four grew — proportionate to the amount of new shared infrastructure delivered (`Tabs`, `Popover`, `Disclosure`, `FilterToolbar`, `MetricGrid`, `SegFilter` keyboard rewrite, pure filter/sort modules, new sub-components), not runaway bloat. **Zero new production dependencies** were added across the entire arc (`git diff cc87968 HEAD -- package.json` is empty) — every KB is first-party code.

No duplicate or racing requests found: the Dashboard's three-widgets-one-fetch de-duplication from the earlier phase is intact; Recruitment's list/detail is a single client-side toggle over already-loaded data with no per-candidate fetch; Transactions filtering is fully client-side.

## 7. Remaining intentional exceptions

- **`loadBranchCogsWaste` (Dashboard branch-comparison fetch) still fails silently.** Unlike `loadReports`/`loadOverview`, this one only affects the COGS/waste columns in the branch-comparison table (SuperAdmin-only, only shown with no branch filter active) — its failure doesn't create a false "everything is fine" signal the way the other two did, since income/expense in that same table come from a different, already-error-handled source. Left as a follow-up rather than expanding this audit's blast radius further.
- **Raw date-range `<input>`s in the Transactions advanced-filter Popover** (not `JalaliDatePicker`) — a deliberate choice made in the original Transactions redesign phase, unchanged here; only their height/focus styling was corrected for consistency.
- **`Field` label association** (`components/ui/Field.tsx` renders a `<div>`, not a `<label htmlFor>`) is a pre-existing, app-wide gap predating Product UI V2 entirely. Out of scope for a page-level consistency audit; would need its own pass across every form in the app.

## 8. Known blockers

- No local database access in this environment — authenticated visual verification (real login, real data, screenshots at all four breakpoints) has not been possible in any phase of this project, including this audit. Every claim above is verified by direct code reading plus the console-error/no-overflow smoke check the dev server allows without login.
- Playwright e2e tests still cannot run for real locally (`.env.e2e` absent) — `playwright --list` confirms all 103 tests parse and are discoverable, matching the pattern established since the very first phase of this project.

---

**Gates run for this audit:** `tsc --noEmit` (0 errors) · `npm test` (420/420) · `npm run lint` (clean, only pre-existing unrelated warnings) · `npm run build` (success, sizes above) · `npx playwright test --list` (103 tests, 13 files) · `git diff --check` (clean).
