# Notification Center V2 — Rollout Guide

## Pre-Rollout Checklist

### 6-Step Release Order (follow exactly)

1. **Set env vars** in Liara dashboard (see below) — before deploy
2. **Run migration** `project-docs/migrations/db-notification-center-v2.sql` on production DB
3. **Merge / push** `feat/notification-center-v2` → triggers deploy on Liara
4. **Verify** deploy succeeded: check Liara build log + app health
5. **Configure processor scheduling** — ⚠️ Liara Next.js platform (`"platform":"next"`) has NO built-in cron field. Pick one:
   - **Option A (recommended)**: Create a Liara Cron Job service that POSTs `https://your-app.liara.run/api/internal/notifications/process` with `Authorization: Bearer <NOTIFICATION_PROCESSOR_SECRET>` every minute
   - **Option B**: External cron (cron-job.org or GitHub Actions schedule) calling the same endpoint
   - **Option C**: Use `scripts/process-notifications.mjs` from a separate Node.js worker app
6. **Monitor** `GET /api/admin/notification-outbox` for failed/dead rows after first run

### Environment Variables (set in Liara dashboard before step 3)

#### Required — processor
```
NOTIFICATION_PROCESSOR_SECRET=<openssl rand -base64 32>   # min 32 chars
APP_URL=https://your-app.liara.run                        # used by scripts/process-notifications.mjs
```

#### Required — SMTP email (provider-neutral — works with Liara Mail, Gmail, Postmark, etc.)
```
MAIL_HOST=smtp.your-smtp-provider.com   # e.g. smtp.liara.ir or smtp.gmail.com
MAIL_PORT=587
MAIL_USER=notifications@yourdomain.com
MAIL_PASSWORD=<smtp-password>
MAIL_FROM=notifications@yourdomain.com
# optional:
MAIL_SECURE=                             # leave blank for port 587; set 'true' for port 465
MAIL_REPLY_TO=support@yourdomain.com
```

#### Optional — SMS (Kavenegar)
```
KAVENEGAR_API_KEY=<api-key>
SMS_DRY_RUN=false   # set 'true' to log without sending (useful for staging)
```

### Migration — Run Once on Production

```sql
-- File: project-docs/migrations/db-notification-center-v2.sql
-- Run via Liara Postgres console, psql, or DBeaver
-- Safe: additive only, idempotent, rerunnable
```

**IMPORTANT**: The migration has NOT been run on production yet. Run it before deploying V2.

---

## What Changed (V2 vs V1)

### Bug Fixes

| # | File | Bug | Fix |
|---|------|-----|-----|
| 1 | `outbox.ts` | `entityId ?? 'null'` caused permanent dedup for null-entity events | Now uses UUID per invocation as eventKey |
| 2 | `outbox.ts` | Payload only had ruleKey/entityId/recipientId — no content | Added `title`, `sub`, `actionUrl` to payload |
| 3 | `processor.ts` | SMS message was just the ruleKey string | Now builds `title: sub` from payload |
| 4 | `processor.ts` | Email fetched content from notification row (breaks if in-app disabled or deduped) | Now uses payload content directly |
| 5 | `service.ts` | No `isActive` filter on admin query | Added `AND is_active = true` |
| 6 | `service.ts` | Ignored outer `tx` parameter, opened own transaction | Now accepts and uses outer tx if provided |
| 7 | `notify.ts` | `_tx?: unknown` was silently ignored | Now typed as `DbTx` and passed through to service |
| 8 | `templates.ts` | `isSafeActionUrl` used `startsWith` — vulnerable to prefix spoofing | Now compares URL origins |
| 9 | `notifications/route.ts` | Cursor only keyed on `createdAt` — misses rows with identical timestamps | Compound `(createdAt, id)` cursor in base64 JSON |
| 10 | `notifications/route.ts` | Unread count computed in-memory (loads all user rows) | Now uses `SELECT COUNT(*) ... WHERE read=false` |
| 11 | `notifications/route.ts` | SELECT then UPDATE separately (not atomic, SELECT result may be stale) | Atomic `UPDATE...RETURNING` with ownership guard |
| 12 | `notifications/route.ts` | Invalid cursor silently returned page 1 | Now returns 400 INVALID_CURSOR |
| 13 | `process/route.ts` | `constantTimeEqual` defined locally | Moved to shared `lib/notifications/secret.ts` |
| 14 | `process/route.ts` | Error leaked `detail: String(err)` to API response | Removed; generic error message only |
| 15 | `channels/sms.ts` | Cap status detected via fragile string comparison `=== 'daily cap reached'` | Added `capExceeded: boolean` to `DeliveryResult` |
| 16 | `processor.ts` | Cap retry used fixed 24h offset | Now uses Tehran midnight via `nextDayMidnightTehran()` |
| 17 | `schema.ts` + migration | `recipient_id NOT NULL ON DELETE CASCADE` — deleting user deletes audit trail | Changed to nullable + `ON DELETE SET NULL` |
| 18 | migration | UPDATE backfill of read_at (potentially slow, locks rows) | Removed; read_at filled going forward |
| 19 | migration | `ON CONFLICT DO UPDATE` for rule seed — overwrites admin settings | Changed to `DO NOTHING` |
| 20 | `SmsPane.tsx` | Duplicate SMS rule management UI | Replaced with link to central admin page |

### ممیزی مستقل ۹‌بخشی — اصلاحات اضافی

| # | فایل | ایراد | اصلاح |
|---|------|-------|-------|
| A1 | `outbox.ts` | SMS و Email یک رویداد، `eventKey` متفاوت می‌گرفتند (UUID جداگانه) | پارامتر اجباری `eventKey: string` در `EnqueueOutboxParams` — محاسبه یک‌بار در `notifyWithClient` |
| A2 | `service.ts` | `resolveRule` و query ادمین‌ها خارج از تراکنش اجرا می‌شدند | `notifyWithClient(params, options, client)` — همه reads+writes یک client |
| A3 | `service.ts` + `recruitment/notify.ts` | default channel مشخص نبود؛ recruitment فقط SMS اعلام می‌کرد | `options.sms ?? true` و `options.email ?? true`؛ recruitment: `{ sms: true, email: true }` |
| A4 | `templates.ts` | `//evil.example` و `///path` به‌عنوان relative URL قبول می‌شدند | `url.startsWith('/') && !url.startsWith('//')` — `//`، `ftp:`، `data:`، `javascript:` همه رد می‌شوند |
| A5 | `notification-outbox/route.ts` | cursor فقط روی `updatedAt` بود؛ retry-one هیچ guard نداشت | Compound `(updatedAt, id)` cursor؛ retry-one: 422 برای `sent`/`processing` |
| A6 | `notificationsSlice.ts` + Bell + page | Bell و page هر کدام state محلی داشتند؛ upsert و unread/archive وجود نداشت | `upsertNotification` + `markNotificationUnread` + `archiveNotification` با optimistic rollback؛ Bell/page از store |
| A7 | `notification-center-v2.test.ts` | cursor codec در tests re-implement شده بود؛ 85 تست جدید نوشته شد | Import از `lib/notifications/cursor`؛ 170/170 سبز |
| A8 | `outbox.ts` + `types.ts` | `recipientId` در `OutboxPayload` (redundant) و کامنت نادرست حریم خصوصی | حذف `recipientId` از JSON payload؛ اصلاح کامنت |
| A9 | migration | CHECK constraints بی‌نام inline در `CREATE TABLE IF NOT EXISTS` — unsafe برای re-run | DO blocks با `IF NOT EXISTS pg_constraint` |

### New Features

- `GET /api/admin/notifications/provider-status` — readiness check for SMTP/SMS (no secrets returned)
- `POST /api/admin/notification-outbox { action: 'retry-one', id }` — per-row retry (فقط dead/failed)
- Pagination در `GET /api/admin/notification-outbox` — compound cursor `(updatedAt, id)`, `nextCursor` در response
- Summary stats در GET: `pending`, `processing`, `dead`, `sentToday`, `oldestPendingAgeSeconds`, `smsConfigured`, `emailConfigured`
- Masked recipient در outbox panel (phone: `0912***4567`, email: `al**@ex****.com`)
- `idempotencyKey` در `NotifyAdminsParams` — callers می‌توانند key ثابت برای null-entity events بدهند
- `lib/notifications/cursor.ts` — codec مشترک برای route + test (بدون duplication)
- Named CHECK constraints در `notification_outbox`
- `upsertNotification` در store — dedup + sort + remove-archived در یک اتمی

---

## Deploy Steps

See **6-Step Release Order** at the top of this file.

---

## Rollback

The migration is additive (no columns dropped). To rollback:
1. Revert the code deploy (Liara: previous image)
2. The migration columns are harmless for V1 code (they have defaults)
3. `notification_outbox` table can be left in place (empty or with existing rows)

---

## Behavioral Invariants (tested — 234/234)

- Two invocations with null entityId → different dedup keys → both sent (no silent dedup)
- SMS و Email یک رویداد → همان `eventKey` → کلید dedupe مشترک
- Prefix-spoofing URL `basharaf.me.evil.example` → rejected by `isSafeActionUrl`
- URL `//evil.example`، `///path`، `ftp:some`، `javascript:alert` → همه rejected
- SMS cap exceeded → retry scheduled at Tehran midnight, not arbitrary +24h
- Deleted user → outbox row `recipient_id` set to NULL → processor skips with status=skipped (not dead)
- Invalid cursor → 400 INVALID_CURSOR (not silent fallback to page 1)
- Email disabled in rules → no outbox row enqueued
- Admin with `is_active=false` → not included in recipients
- `retry-one` روی row با status `sent` یا `processing` → 422 NOT_RETRYABLE
- `upsertNotification` → dedup by id، sort `(createdAt DESC, id DESC)`، archived از list حذف
- `markRead`، `markUnread`، `archive`، `markAllRead` → optimistic rollback اگر API fail شود
- `unreadCount()` → archived را شمارش نمی‌کند
