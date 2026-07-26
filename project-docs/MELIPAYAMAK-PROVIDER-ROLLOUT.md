# MeliPayamak SMS Provider — Rollout Guide

Branch: `feat/melipayamak-provider` (not merged to `main`, not deployed, no
production access used, no secrets or migration executed in this work).

## What this adds

A second SMS provider, MeliPayamak, alongside the existing Kavenegar
integration. The active provider is selected purely by the `SMS_PROVIDER`
env var — no code change needed to switch providers. Daily cap, dedup,
`sms_log`, notification outbox retry, and `SMS_DRY_RUN` are all unchanged
and provider-agnostic; they operate above the provider layer exactly as
before.

## Architecture

```
lib/sms/
  types.ts        SmsProviderName, SmsSendOutcome, SMS_REQUEST_TIMEOUT_MS
  phone.ts         normalizeIranPhone() — pure, 09xxxxxxxxx normalization
  kavenegar.ts     kavenegarSend() — unchanged behavior + timeout + redaction
  melipayamak.ts   melipayamakSend() — new adapter
  dispatcher.ts    resolveSmsProvider() / getSmsProviderStatus() / dispatchSms()
  sendSms.ts       unchanged public contract — cap/dedup/sms_log, now calls dispatchSms()
```

`sendSms()`'s exported signature (`SendSmsParams` → `SendSmsResult`) did
not change — every existing caller (`lib/notifications/channels/sms.ts`,
`/api/sms/test-notify`) works unmodified.

## Provider selection logic

- `SMS_PROVIDER=melipayamak` or `SMS_PROVIDER=kavenegar` (case-insensitive)
  → that provider.
- `SMS_PROVIDER` unset → **Kavenegar**, for backward compatibility. This
  matches the exact behavior every existing deployment already has today.
- `SMS_PROVIDER` set to anything else (typo, unsupported provider name)
  → **fail-closed**. `sendSms()` returns `status: 'failed'` with a clear,
  redacted error naming the invalid value and the two allowed values. No
  network call is made, and no silent fallback to either provider happens.
- **No automatic fallback between providers on failure.** A timeout from
  one provider does not trigger a retry against the other — an ambiguous
  timeout (message may or may not have actually been sent) could otherwise
  cause a real duplicate SMS send. Retries are handled by the existing
  notification-outbox retry mechanism, which retries the *same* configured
  provider on its own schedule.

## Provider-specific configured/dry-run semantics

| Situation | Kavenegar | MeliPayamak |
|---|---|---|
| Provider selected, all required env vars set, `SMS_DRY_RUN` unset | sends for real | sends for real |
| Provider selected, `SMS_DRY_RUN=true` | dry-run (no network call) | dry-run (no network call) |
| Provider selected, required env vars **missing**, `SMS_DRY_RUN` unset | **dry-run** (pre-existing, tested behavior — kept exactly as-is) | **fail-closed** (`status: 'failed'`, clear error) |

Kavenegar's "missing key → dry-run" behavior is a pre-existing, tested
contract (`tests/unit/notification-center-v2.test.ts`) relied on by
existing deployments that never set `KAVENEGAR_API_KEY` — changing it
would be a breaking behavior change, so it is preserved exactly.
MeliPayamak has no such history, so it follows the stricter fail-closed
contract requested for this feature: an explicitly-selected but
misconfigured provider should never silently look like a successful
dry-run.

## MeliPayamak request contract

```
POST https://rest.payamak-panel.com/api/SendSMS/SendSMS
Content-Type: application/x-www-form-urlencoded

username=<MELIPAYAMAK_USERNAME>
password=<MELIPAYAMAK_PASSWORD>
to=<normalized 09xxxxxxxxx phone>
from=<MELIPAYAMAK_FROM>
text=<message>
isFlash=false
```

Response is checked against the official contract: `RetStatus === 1` maps
to `status: 'sent'`, and `Value` (the message id) is captured as
`providerMessageId`. Any other `RetStatus` maps to `status: 'failed'`,
with `StrRetStatus` surfaced in the (redacted) error message. A request
timeout (10s, `AbortSignal.timeout`) or network error also maps to
`failed`, never to a silent retry or a different provider.

## What's stored in `sms_log`

No migration was needed — `sms_log.provider` already existed as a free
`text` column (default `'kavenegar'`) from the original schema, but
`sendSms()` never explicitly set it, so every row silently said
`'kavenegar'` regardless of which provider actually handled it. This is
now fixed: the actual resolved provider name (or `'unknown'` for the
invalid-`SMS_PROVIDER` case) is written to `sms_log.provider`, and is also
embedded inside `sms_log.providerResponse` (`{ provider, raw, messageId }`)
per the requested contract — belt-and-suspenders, no migration either way.

## Env vars to set in Liara (when ready to switch)

```
SMS_PROVIDER=melipayamak
MELIPAYAMAK_USERNAME=<real username>
MELIPAYAMAK_PASSWORD=<real password>
MELIPAYAMAK_FROM=<real sender number>
```

Leave `KAVENEGAR_API_KEY` in place if you want the ability to switch back
to Kavenegar by only changing `SMS_PROVIDER` (no redeploy of code needed,
just the env var). To go back to Kavenegar: set `SMS_PROVIDER=kavenegar`
(or unset it entirely, since that's the backward-compat default).

`SMS_DRY_RUN` behaves identically regardless of provider — set it to
`true` to test the full notification pipeline without sending a real SMS
to anyone.

## How to test dry-run (no real SMS, no network call)

1. Set `SMS_PROVIDER=melipayamak` and `SMS_DRY_RUN=true` locally (or leave
   `MELIPAYAMAK_USERNAME`/`PASSWORD`/`FROM` entirely unset — dry-run is
   checked before the config-completeness check, so it short-circuits
   either way).
2. Call `sendSms({ phone: '09121234567', message: 'test' })` from any
   existing call site, or hit `POST /api/sms/test-notify` as SuperAdmin
   with the notification rule `sms.test_notify` enabled in Settings →
   پیامک.
3. Confirm a new `sms_log` row with `status='dry_run'` and
   `provider='melipayamak'`, and confirm no outbound HTTP request was made
   (no MeliPayamak credentials are required for this path to work).

## How to test a real send (requires real MeliPayamak credentials)

1. Set `SMS_PROVIDER=melipayamak`, all three `MELIPAYAMAK_*` vars to real
   values, and make sure `SMS_DRY_RUN` is unset or `false`.
2. Trigger a send via `/api/sms/test-notify` (SuperAdmin only) against a
   real test phone number.
3. Confirm the returned `sms_log` row: `status='sent'`,
   `provider='melipayamak'`, and `providerResponse.messageId` populated
   with MeliPayamak's returned `Value`.
4. Check `/api/admin/notifications/provider-status` — `sms.provider`
   should read `"melipayamak"` and `sms.configured` should be `true`
   (no secret values are ever returned by this endpoint).

## Files changed

- `lib/sms/types.ts` — added `SmsProviderName`, `SmsSendOutcome`,
  `SmsProviderAdapter`, `SMS_REQUEST_TIMEOUT_MS`
- `lib/sms/phone.ts` — **new**, `normalizeIranPhone()`
- `lib/sms/melipayamak.ts` — **new**, `melipayamakSend()`
- `lib/sms/dispatcher.ts` — **new**, `resolveSmsProvider()` /
  `isProviderConfigured()` / `getSmsProviderStatus()` / `dispatchSms()`
- `lib/sms/kavenegar.ts` — refactored to the shared `SmsSendOutcome` shape;
  added request timeout and error redaction; **send logic unchanged**
- `lib/sms/sendSms.ts` — added phone normalization at the top; swapped the
  direct `kavenegarSend()` call for `dispatchSms()`; now writes the actual
  provider onto `sms_log.provider` and into `providerResponse`; **cap,
  dedup, and dry-run logic bodies are byte-for-byte unchanged**
- `lib/notifications/redaction.ts` — added a Kavenegar-URL-specific
  redaction pattern and a general `user:password@` pattern (found while
  writing the "no secret leakage" tests below — the API key is embedded
  directly in the Kavenegar request URL path, which the prior generic
  patterns did not catch)
- `app/api/admin/notifications/provider-status/route.ts` — now reports
  the active provider name via `getSmsProviderStatus()` instead of a
  hardcoded `KAVENEGAR_API_KEY` check; response shape gains `sms.provider`
- `app/api/admin/notification-outbox/route.ts` — same swap for
  `summary.smsConfigured`; response shape gains `summary.smsProvider`
- `components/settings/SmsPane.tsx` — hint text made provider-neutral
  (previously hardcoded "if KAVENEGAR_API_KEY is absent...")
- `.env.example` — documented `SMS_PROVIDER`, `MELIPAYAMAK_USERNAME`,
  `MELIPAYAMAK_PASSWORD`, `MELIPAYAMAK_FROM`
- `tests/unit/sms-provider.test.ts` — **new**, 30 tests (phone
  normalization, provider resolution, both adapters, secret redaction)
- `tests/unit/sms-send.test.ts` — **new**, 9 tests (`sendSms()`-level:
  daily cap, dedup, phone normalization, provider recorded on the log row)
- `tests/unit/notification-center-v2.test.ts` — 2 tests added to the
  existing `provider-status route` describe block, for both providers

## Known limitations / intentionally out of scope

- No migration — `sms_log.provider` already existed as an unconstrained
  `text` column; nothing needed adding.
- No UI to switch providers from the admin panel — this is an env-var-only
  switch by design, matching the request. `SmsPane.tsx` displays status
  but does not let an admin change `SMS_PROVIDER` at runtime.
- No live network test against the real MeliPayamak API was performed (no
  production access, no real credentials available in this environment).
  All MeliPayamak-specific behavior (request shape, response mapping,
  timeout, error handling) is verified with `fetch` mocked to the
  documented official response contract.
