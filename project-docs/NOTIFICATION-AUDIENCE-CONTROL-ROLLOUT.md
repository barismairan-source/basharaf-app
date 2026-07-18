# Notification Audience & Access Control — Rollout Guide

Branch: `feat/notification-audience-control` (not merged to `main`, not deployed, migration not run).

## What this adds

SuperAdmin can now control, per notification rule and per channel
(in-app / SMS / email), **who** receives it — not just whether the rule
is on. Previously every broadcast rule hardcoded "all active
SuperAdmins"; that remains the exact default when no custom audience is
configured (zero-config rules behave identically to before).

## Deploy steps (when ready — do NOT run yet)

1. **Run the migration** on production DB:
   `project-docs/migrations/db-notification-audience-control.sql`
   — additive only, wrapped in `BEGIN`/`COMMIT`, idempotent (safe to
   re-run). Creates `notification_rule_targets` and seeds the 6
   anomaly-detective rule keys into `notification_rules` (previously
   those keys were referenced by `lib/anomaly/engine.ts` but had no row
   in `notification_rules`, so they silently never sent anything — see
   "Bug fixed" below).
2. **Merge** `feat/notification-audience-control` → `main` → triggers
   auto-deploy (GitHub Actions → Liara), same as every prior release.
3. **No new env vars.** No new secrets. No SMTP/SMS provider changes.
4. **Verify**: open `/admin/settings/notifications`, confirm rules render
   grouped by category and the "گیرندگان" drawer opens.
5. **Nothing needs re-enabling automatically** — every existing rule keeps
   sending to all active SuperAdmins until a SuperAdmin explicitly opens
   a rule's "گیرندگان" drawer and saves a custom audience.

## Bug fixed as part of this work

`lib/anomaly/engine.ts` has been calling `notifyAdmins()` with rule keys
`waste_spike`, `below_approval_limit`, `consumption_spike`,
`rejection_pattern`, `price_jump`, `off_hours_activity` since the anomaly
detector shipped — but none of those keys ever existed as a row in
`notification_rules`. `resolveRule()` returns `null` for an unknown key,
and the service short-circuits before writing anything. Every "high" and
"medium" severity detective finding was silently dropped at the
notification layer (the finding itself was still saved and visible on
`/detective` — only the *notification about it* never fired). This
migration seeds all 6 keys with `enabled=true, sms_enabled=false,
in_app_enabled=true, email_enabled=false` (conservative — SMS/email stay
opt-in via the panel, matching how every other rule behaves).

## Architecture

- `lib/notifications/catalog.ts` — single typed source of truth for rule
  metadata (title, description, category, trigger text, threshold
  type/unit, required section/capability, branch-awareness, sensitivity,
  `audienceConfigurable`).
- `lib/notifications/audience.ts` — `resolveAudience()` is a pure
  function (no DB) implementing the resolution contract; DB-fetching
  wrappers (`fetchAudienceTargets`, `fetchCandidateUsers`,
  `fetchAllAudienceTargets`) feed it from `notification_rule_targets` +
  `users`.
- `lib/notifications/service.ts` — `runBatch()` now resolves recipients
  **per channel** (in-app/SMS/email can have different audiences for the
  same event) instead of one hardcoded SuperAdmin query.
- `app/api/admin/notification-audience/route.ts` — GET (rules + catalog
  + per-channel recipient counts + raw targets) and action-dispatched
  POST (`preview` / `replace` / `copy` / `reset`), matching the existing
  `notification-outbox` route's action-based POST convention.
- `app/api/admin/notification-audience/options/route.ts` — selectable
  users/roles/branches for the recipient picker (masked contact info
  only).
- `components/admin/notifications/RecipientDrawer.tsx` — the "گیرندگان"
  editor: per-channel tabs, default/custom mode, include/exclude lists,
  live preview, copy-between-channels, reset, explicit save/cancel with
  unsaved-change and 409-conflict handling.

## Personal vs. broadcast notifications

`pending_approval` (and the equivalent reuse of `voucher_pending`'s key
inside `app/api/inventory/vouchers/[id]/approve/route.ts`) notify **the
exact creator** of the thing being approved via `lib/notify.ts`'s
`notify()` — a single targeted recipient chosen by the event itself, not
an audience. These are marked `audienceConfigurable: false` in the
catalog and never resolved through `resolveAudience()`. The "گیرندگان"
button does not appear for them in the UI; the API rejects
preview/replace/copy/reset attempts on them with `422
NOT_AUDIENCE_CONFIGURABLE`. See
`tests/unit/notification-audience.test.ts` → `catalog — personal vs
broadcast rules`.

## Known local-environment limitation (pre-existing, not introduced here)

Playwright E2E (`tests/e2e/notification-audience.spec.ts`, 7 new tests)
passes `playwright --list` but cannot execute locally in this sandbox:
`global-setup.ts` needs `E2E_DATABASE_URL` (`.env.e2e` absent — the same
gap documented in HANDOFF.md for months) and the config's webServer
health-check is hardcoded to port 3000, which is occupied by an
unrelated pre-existing process in this sandbox. Neither issue is new or
caused by this branch.
