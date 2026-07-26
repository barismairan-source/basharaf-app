# MeliPayamak SMS Provider — Rollout Guide

Original branch `feat/melipayamak-provider` was merged to `main` and
deployed. **This doc now reflects a follow-up correction on branch
`fix/melipayamak-token-api`** (not yet merged/deployed): the initial
implementation targeted MeliPayamak's legacy username/password REST API
(`rest.payamak-panel.com/api/SendSMS/SendSMS`), matching the contract given
in the original task spec. After seeing screenshots of the actual account's
panel, it turned out the account uses MeliPayamak's newer **token-based
console API** (`console.melipayamak.com/api/send/simple/{token}`) instead
— so the adapter was switched to match what's actually active on the
account. No production access was used; no real MeliPayamak credentials
were ever entered anywhere in this environment.

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
POST https://console.melipayamak.com/api/send/simple/<MELIPAYAMAK_TOKEN>
Content-Type: application/json

{ "from": "<MELIPAYAMAK_FROM>", "to": "<normalized 09xxxxxxxxx phone>", "text": "<message>" }
```

The account token is embedded directly in the URL path — no username or
password is sent. Response shape, per the panel's own documentation
(visible in the "ارسال پیامک ساده" page under دریافت پاسخ):

```json
{ "recId": 3741437414, "status": "شرح خطا در صورت بروز" }
```

`status` is documented as populated **only when an error occurs**, so
success is inferred as: HTTP OK, `status` empty/absent, and `recId` a
positive number. `recId` is then captured as `providerMessageId`. Any
other combination (non-empty `status`, missing/zero `recId`, or a non-OK
HTTP response) maps to `status: 'failed'`, with `status` (when present)
surfaced in the error message. A request timeout (10s,
`AbortSignal.timeout`) or network error also maps to `failed`, never to a
silent retry or a different provider.

Because the panel's own documentation for this endpoint is thin (a single
example, no explicit list of non-success `status` values), this success
inference should be double-checked against one real test send before
relying on it for production alerting — see "How to test a real send"
below.

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
MELIPAYAMAK_TOKEN=<real console token>
MELIPAYAMAK_FROM=<real sender line number>
```

**Where to find these in the MeliPayamak panel (console.melipayamak.com):**
- `MELIPAYAMAK_TOKEN`: open "ارسال پیامک" → "ساده" in the sidebar; the API
  address shown there is `.../api/send/simple/<TOKEN>` — the token is the
  long string at the end of that URL. This is account-specific and acts
  as a credential (see the redaction pattern added for it below) — copy
  it straight into Liara's env var panel, don't paste it anywhere else.
- `MELIPAYAMAK_FROM`: the sender line number for the account, visible on
  the dashboard / "خطوط من" section (a long shared-line number, e.g.
  `50004000790780`, or a shorter dedicated line depending on what was
  purchased).

Leave `KAVENEGAR_API_KEY` in place if you want the ability to switch back
to Kavenegar by only changing `SMS_PROVIDER` (no redeploy of code needed,
just the env var). To go back to Kavenegar: set `SMS_PROVIDER=kavenegar`
(or unset it entirely, since that's the backward-compat default).

`SMS_DRY_RUN` behaves identically regardless of provider — set it to
`true` to test the full notification pipeline without sending a real SMS
to anyone.

## How to test dry-run (no real SMS, no network call)

1. Set `SMS_PROVIDER=melipayamak` and `SMS_DRY_RUN=true` locally (or leave
   `MELIPAYAMAK_TOKEN`/`FROM` entirely unset — dry-run is checked before
   the config-completeness check, so it short-circuits either way).
2. Call `sendSms({ phone: '09121234567', message: 'test' })` from any
   existing call site, or hit `POST /api/sms/test-notify` as SuperAdmin
   with the notification rule `sms.test_notify` enabled in Settings →
   پیامک.
3. Confirm a new `sms_log` row with `status='dry_run'` and
   `provider='melipayamak'`, and confirm no outbound HTTP request was made
   (no MeliPayamak credentials are required for this path to work).

## How to test a real send (requires the real MeliPayamak token)

1. Set `SMS_PROVIDER=melipayamak`, both `MELIPAYAMAK_TOKEN`/`FROM` to real
   values, and make sure `SMS_DRY_RUN` is unset or `false`.
2. Trigger a send via `/api/sms/test-notify` (SuperAdmin only) against a
   real test phone number.
3. Confirm the returned `sms_log` row: `status='sent'`,
   `provider='melipayamak'`, and `providerResponse.messageId` populated
   with MeliPayamak's returned `recId`. **Given the thin panel
   documentation for the success/error shape (see above), this first real
   test is the actual verification that the success-inference logic is
   correct** — if a real send comes back mapped as `failed` despite
   actually arriving, or vice versa, that's a signal the response shape
   assumption needs adjusting in `lib/sms/melipayamak.ts`.
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
  writing the "no secret leakage" tests — the API key is embedded
  directly in the Kavenegar request URL path, which the prior generic
  patterns did not catch); **follow-up:** also added a matching pattern
  for MeliPayamak's `console.melipayamak.com/api/send/simple/{token}`,
  since its token has the same embedded-in-URL leak shape
- `app/api/admin/notifications/provider-status/route.ts` — now reports
  the active provider name via `getSmsProviderStatus()` instead of a
  hardcoded `KAVENEGAR_API_KEY` check; response shape gains `sms.provider`
- `app/api/admin/notification-outbox/route.ts` — same swap for
  `summary.smsConfigured`; response shape gains `summary.smsProvider`
- `components/settings/SmsPane.tsx` — hint text made provider-neutral
  (previously hardcoded "if KAVENEGAR_API_KEY is absent...")
- `.env.example` — documented `SMS_PROVIDER`, `MELIPAYAMAK_TOKEN`,
  `MELIPAYAMAK_FROM`
- `tests/unit/sms-provider.test.ts` — 30 tests (phone normalization,
  provider resolution, both adapters, secret redaction); the MeliPayamak
  subset was rewritten in the follow-up to match the token-based contract
- `tests/unit/sms-send.test.ts` — 9 tests (`sendSms()`-level: daily cap,
  dedup, phone normalization, provider recorded on the log row) —
  unaffected by the follow-up (mocks `dispatchSms` directly)
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
