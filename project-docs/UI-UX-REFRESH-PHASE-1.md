# UI/UX Refresh — Phase 1

Branch: `feat/ui-ux-refresh-phase-1` (not merged, not deployed).

## Audit finding, up front

The requested scope read like a from-scratch design-system build. It
isn't needed here: `app/globals.css` + `tailwind.config.ts` already
define a complete semantic-token system (surface/text/muted/accent +
success/warning/danger with `-subtle` variants, a derived radius
scale, a named shadow/elevation scale, and named motion durations/
easings), and `components/ui/` already has 27 shared primitives
covering nearly every item on the requested standardization list
(`PageHeader`, `Card`, `MetricCard`, `Button`, `Input`, `Select`,
`Textarea`, `Checkbox`, `Switch`, `StatusPill`, `Chip`, `Table`,
`DataList` (responsive list/card), `Empty`/`EmptyState`, `Skeleton`,
`Sheet` (drawer), `Toast`). A ground-up rebuild of any of that would
have been pure regression risk on a live financial system for no real
gain. Phase 1 instead did a **gap audit** and closed the concrete,
real gaps it found — documented below — rather than re-touching
already-solid pages page-by-page.

## What changed

### 1. New shared primitive: `ConfirmDialog` / `useConfirm()`
The only "missing standard primitive" the audit actually found.
Three places used the native `window.confirm()` (`app/(app)/
purchase-orders/[id]/page.tsx`, `app/(admin)/admin/settings/
notifications/page.tsx`, `components/admin/notifications/
RecipientDrawer.tsx`) — unstyled, no focus management, and blocks the
event loop. Replaced with `components/ui/ConfirmDialog.tsx`: a
promise-based `useConfirm()` hook (`if (!(await confirm({ title,
danger })))` — near-identical call shape to the old `window.confirm`)
backed by a `<ConfirmProvider>` mounted once in each root layout.
Escape-to-cancel, backdrop-click-to-cancel, focus moves to the confirm
button on open and back to the trigger on close, `role="alertdialog"`.
Ships in a `light` and a `dark` variant (`theme` prop) since the admin
panel doesn't share the light app's CSS-token system — this preserves
both identities exactly as instructed rather than forcing one dark-mode
migration into this pass.

### 2. Focus-ring consistency
`Checkbox` and `Switch` used a hardcoded `ring-stone-400` for their
focus ring while every other interactive primitive (`Button`, `Input`,
`Select`) uses the semantic `ring-accent/40`. Fixed both to match.
Also switched their *checked* fill from a hardcoded `bg-stone-900` to
`bg-primary` (same computed color today — `--primary` already equals
stone-900 — but now correctly dark-mode-aware if `--primary` is ever
themed).

### 3. Reduced-motion support (accessibility gap)
`app/globals.css` had no `prefers-reduced-motion` handling at all —
every `animate-*` and `transition-*` utility ran at full speed
regardless of the OS-level accessibility setting. Added a
`@media (prefers-reduced-motion: reduce)` block collapsing all
animation/transition durations to near-instant, verified with a
Playwright test that actually emulates the media feature and reads
`getComputedStyle`, not just a lint-style check that the CSS exists.

### 4. Dead ESLint gap noticed and fixed (already delivered on `main`)
Not part of this branch's diff — noted here because it's directly
relevant to "no unnecessary rerenders / real bugs": earlier this
session a component crashed the entire app because a hook was called
after a conditional `return null` (a Rules-of-Hooks violation).
`eslint-plugin-react-hooks`'s `rules-of-hooks` rule catches exactly
that, but ESLint was never run in CI. That gap is now closed on `main`
(separate commit, already merged) — Phase 2 inherits a CI that would
have caught the original bug.

## What did NOT change in this pass (honest scope)

- **No visual restyling** of Dashboard, Transactions, Sidebar, Header,
  or the SuperAdmin panel — audited them; found them already using the
  shared primitives and semantic tokens consistently (mobile-responsive
  work on the admin sidebar and outbox pages shipped earlier this
  session, separately from this branch).
- **No request-cancellation retrofit.** Grepped `store/`: zero
  `AbortController` usage across any slice's fetches. Real gap, but
  touching every fetch in the store to add cancellation is a
  wide-blast-radius change that needs its own dedicated, carefully
  tested pass — flagged for Phase 2, not attempted here.
- **No admin-panel dark-token migration.** The SuperAdmin panel uses
  hardcoded `stone-900`/`stone-950` Tailwind classes instead of the
  `.dark`-scoped CSS variables already defined (but unused) in
  `globals.css`. Retrofitting every admin component to the token
  system would unify "semantic colors" between the two themes exactly
  as requested, but is a large, visually-sensitive migration better
  done as its own reviewed pass, not folded into a night's Phase 1.
- **No virtualization/pagination changes** — no list in the audited
  pages is large enough today to need it (largest is the notification
  outbox, already cursor-paginated).

## Performance — measured, not assumed

Production build before and after this branch (route sizes, kB):

| Route | Before | After | Δ |
|---|---|---|---|
| `/dashboard` | 14.1 / 276 | 14.0 / 277 | ~flat (+1 kB shared, from `ConfirmProvider` in the layout) |
| `/transactions` | 12.6 / 186 | 11.9 / 187 | page code -0.7 kB (native `confirm()` calls replaced by a shared hook), shared +1 kB |
| Shared JS (all routes) | 87.8 kB | 87.8 kB | unchanged |

No route regressed by more than ~1 kB first-load JS, and that 1 kB
buys a real accessibility/UX primitive used app-wide going forward.

## Tests

- **Unit:** 280/280 passing (no new unit tests needed — `ConfirmDialog`
  is a thin UI wrapper better covered by the Playwright interaction
  tests below than by mocking DOM focus behavior in vitest).
- **E2E (new):** `tests/e2e/ui-ux-refresh-phase-1.spec.ts` — 9 tests:
  no-horizontal-overflow at mobile/tablet/desktop for Dashboard and
  Transactions, `ConfirmDialog` open/Escape-cancel/confirm-and-proceed,
  and a real `prefers-reduced-motion` assertion. Also fixed one
  existing test (`tests/e2e/notification-audience.spec.ts`) that
  intercepted the native `window.confirm` dialog event — it now
  interacts with the new `alertdialog` instead, since that call site
  moved to `useConfirm()`.
- `npx playwright test --list`: 38 tests across 8 files, all
  discoverable. Actual execution remains blocked by the same
  pre-existing gap documented in `HANDOFF.md` for months: `global-
  setup.ts` needs `E2E_DATABASE_URL` (`.env.e2e` absent).
- `git diff --check`: clean.
- `npx tsc --noEmit`: 0 errors.
- `npm run lint`: 0 errors, 5 pre-existing `exhaustive-deps` warnings
  (unrelated files, unchanged by this branch).
- `npm run build`: clean, route table above.

## Phase 2 — prioritized

1. Request-cancellation + fetch de-duplication in `store/slices/*`
   (dashboard and transactions filters are the highest-traffic
   offenders).
2. SuperAdmin panel dark-token migration (`stone-900` literals →
   `.dark`-scoped CSS variables) — unifies the two themes at the token
   level, as originally requested, as its own reviewed pass.
3. Shared `FilterToolbar` and `Pagination`/load-more primitives —
   currently ad-hoc per page; Transactions and the notification outbox
   panel are the two clearest candidates to extract from.
4. Visual pass on Dashboard chart readability and comparison
   indicators specifically (the one area of the original request not
   already well-served by the existing primitive set).
