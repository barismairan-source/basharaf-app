# Web Push Notifications — Rollout Guide

Branch `feat/web-push-notifications`. Adds a fourth notification channel
(browser push) alongside the existing in-app / SMS / email channels — it
does not replace or change any of them.

## What this adds

- A `push_subscriptions` table storing each user's browser push
  subscriptions (a user may have several — one per browser/device).
- A `push` outbox channel, resolved and delivered exactly like `sms`/`email`
  through the existing `notification_outbox` pipeline (same retry schedule,
  same audience/targeting system, same per-rule enable flag pattern).
- A minimal service worker (`public/sw-push.js`) that shows the
  notification and focuses/opens the app on click.
- A self-serve opt-in toggle in **تنظیمات → تنظیمات سامانه → اعلان‌ها**
  (`PreferencesPane`, available to any authenticated user — not
  SuperAdmin-only, since push audiences can target any role, same as
  email/SMS addresses).
- A per-rule "نوتیفیکیشن" checkbox in the SuperAdmin notification-rules
  admin page and recipient drawer, matching the existing SMS/email pattern.

## Architecture

```
lib/notifications/
  channels/push.ts   sendPushToUser() — web-push adapter, multi-device fan-out,
                     self-healing (deletes expired 404/410 subscriptions)
  audience.ts        CandidateUser.hasPushSubscription + 'missing_push_subscription'
                     eligibility reason
  rules.ts           ResolvedRule.pushEnabled, shouldEnqueuePush()
  service.ts         runBatch() resolves+enqueues 'push' outbox rows like sms/email
  processor.ts       dispatches row.channel === 'push' to sendPushToUser()

lib/push/
  subscribeToPush.ts Browser-side: register SW, request permission, subscribe,
                     POST to /api/push/subscribe. Also unsubscribe + support detection.

app/api/push/
  subscribe/route.ts    Upserts a subscription for the current session user
  unsubscribe/route.ts  Removes one subscription (scoped to the caller)

public/sw-push.js   Service worker — push + notificationclick handlers only,
                     no offline caching
```

Every real notification rule that has `channels` including `'push'` in
`lib/notifications/catalog.ts` can now deliver push once a SuperAdmin turns
on `pushEnabled` for that rule (same admin panel as SMS/email) — the
`sms.test_notify` rule was deliberately left push-free since it's an
SMS-pipeline-specific debug tool.

## Why VAPID, not a third-party push service

Web Push (the W3C standard used by all modern browsers) requires a VAPID
keypair to identify the sending application to the browser's own push
service (Google's for Chrome, Mozilla's for Firefox, Apple's for Safari) —
this is **self-generated once**, not an account with any external vendor.
Unlike SMS (Kavenegar/MeliPayamak), there is no per-message cost and no
Iran-specific delivery restriction to work around.

## Multi-device delivery and cleanup

A user may subscribe from multiple browsers/devices. One outbox row per
(rule, event, recipient) is still created — at delivery time,
`sendPushToUser()` fans out to every stored subscription for that user and
counts the row `sent` if **any** subscription succeeds. Subscriptions the
push service reports as gone (`404`/`410` — the browser cleared them, or
the user revoked permission) are deleted immediately; this is standard Web
Push hygiene, not an error condition, and prevents forever-retrying a dead
endpoint.

## iOS/Safari caveat

iOS Safari only supports Web Push for a PWA added to the home screen, not
a regular Safari tab. `getPushSupportStatus()` in
`lib/push/subscribeToPush.ts` feature-detects this and the UI shows
"پشتیبانی نمی‌شود" instead of a broken toggle — no crash, just an honest
unsupported state.

## Env vars required

```
VAPID_PUBLIC_KEY=...            # server-side, used to sign push messages
VAPID_PRIVATE_KEY=...           # server-side secret — never expose to client
VAPID_SUBJECT=mailto:you@yourdomain.com   # contact per the Push spec
NEXT_PUBLIC_VAPID_PUBLIC_KEY=... # same value as VAPID_PUBLIC_KEY, client-side
```

Generate once with:

```bash
npx web-push generate-vapid-keys
```

If these are unset, `isPushConfigured()` returns false: the admin panel's
guard (mirroring the existing SMTP guard) rejects turning `pushEnabled` on
for any rule with a clear 422, and any already-enqueued push row retries
(status `failed`, not `skipped`) until VAPID is configured — same
retryable-vs-permanent-skip semantics as the email channel when SMTP is
temporarily unavailable.

## Testing without a live account

Unlike SMS, there's no external account needed to test locally — any
browser that supports Web Push can subscribe to a VAPID keypair generated
on the spot. No production access or real user data was used while
building this.

## Known follow-ups (not done in this pass)

- No UI to see *how many* devices a user has subscribed from, or to
  individually revoke one device from another. Today only the
  currently-open browser's own subscription can be added/removed via the
  toggle.
- `sw-push.js` is a standalone, minimal service worker — if the app later
  adds a general offline/caching service worker, the two should likely be
  merged rather than running two separate service workers.
