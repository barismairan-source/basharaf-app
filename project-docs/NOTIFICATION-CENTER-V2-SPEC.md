# Notification Center V2 — Architecture Specification

**Project:** با شرف  
**Version:** 0.28.0  
**Date:** 2026-07-16  
**Status:** Local feature branch — `feat/notification-center-v2`

---

## 1. Current Architecture

### 1.1 Data Flow (v1)

```
Business event (approve tx, insert job_application, anomaly)
  → lib/notify.ts: notify() / notifyAdmins()
      ├── Check notification_rules.enabled
      ├── INSERT INTO notifications (userId, or userId=null for broadcast)
      └── if sms option: sendSms() fire-and-forget per admin
            └── lib/sms/sendSms.ts → kavenegarSend() → Kavenegar API
                └── INSERT sms_log (status)

Client bootstrap:
  GET /api/notifications
    → SELECT WHERE userId=session OR userId IS NULL (gap #2)
    → returns all rows, unbounded (gap #3)
    → time field is static text set at insert time (gap #6)

Client PATCH /api/notifications:
  { id } → UPDATE SET read=true WHERE id=? (no user_id check — gap #1)
  { markAllRead } → UPDATE SET read=true WHERE userId=session
```

### 1.2 Components (v1)
- `lib/notify.ts` — entry point; rule check + notification insert + SMS fire-and-forget
- `app/api/notifications/route.ts` — GET (unbounded) + PATCH (no ownership guard)
- `components/layout/NotificationsBell.tsx` — dropdown/sheet; no filters, no rollback, no accessibility
- `store/slices/notificationsSlice.ts` — optimistic read with no rollback
- `lib/realtime/useRealtime.ts` — INSERT-only subscription; no UPDATE handling

---

## 2. Identified Security and Scaling Gaps

| # | Gap | Severity |
|---|-----|----------|
| 1 | `PATCH /api/notifications` updates by `id` without constraining `user_id` — any authenticated user can mark another user's notification as read | **High** |
| 2 | `GET /api/notifications` returns global `user_id IS NULL` rows alongside personal rows — shared read state across all users | **High** |
| 3 | `GET /api/notifications` loads all rows without pagination — can return unbounded history | **Medium** |
| 4 | Optimistic read update in `notificationsSlice` has no rollback on API failure | **Low** |
| 5 | `useRealtime` subscribes to `INSERT` only; `UPDATE` to read/archived state is not propagated across tabs | **Medium** |
| 6 | `time` field is set as static text `'به‌تازگی'` at insert — becomes stale immediately | **Low** |
| 7 | SMS is fire-and-forget with no durable outbox — failures are not retried | **Medium** |
| 8 | SMS rule toggles are duplicated between `/admin/settings/notifications` and `SmsPane` | **Low** |
| 9 | Email delivery does not exist | **Feature gap** |
| 10 | Delivery health and failed attempts are not visible to administrators | **Observability gap** |

---

## 3. Target Architecture

```
Business event
  → lib/notifications/service.ts: notifyAdmins()
      ├── Check notification_rules (enabled, in_app_enabled, sms_enabled, email_enabled)
      ├── For each recipient:
      │   ├── Derive stable dedupe_key (ruleKey + entityId + userId + channel)
      │   ├── INSERT INTO notifications (per-user row, never null-user)
      │   └── INSERT INTO notification_outbox (sms row, if sms allowed)
      │   └── INSERT INTO notification_outbox (email row, if email allowed)
      └── Return — caller's HTTP response is not affected

Outbox processor (POST /api/internal/notifications/process):
  ├── Protected by NOTIFICATION_PROCESSOR_SECRET
  ├── Claim ≤25 rows FOR UPDATE SKIP LOCKED
  ├── For each row:
  │   ├── sms → lib/notifications/channels/sms.ts → kavenegarSend
  │   └── email → lib/notifications/channels/email.ts → nodemailer
  └── Update status (sent/failed/dead/skipped)

Client:
  GET /api/notifications?cursor=&filter=&limit=20
    → keyset pagination by createdAt/id
    → only rows WHERE userId=session.sub (NO null-user rows)
    → returns nextCursor, unreadCount, ISO timestamps
    → client derives relative time from createdAt

  PATCH /api/notifications
    → all mutations: WHERE id=? AND user_id=session.sub
    → mark-all: WHERE user_id=session.sub only

Realtime: INSERT + UPDATE on notifications WHERE user_id=session.sub
```

---

## 4. Notification Lifecycle

```
INSERT (by service.ts)
  status: delivered to notification_outbox (pending)
  read: false
  readAt: null
  archivedAt: null

User views
  → PUT read=true, readAt=NOW() (optimistic, rollback on fail)

User archives
  → PUT archivedAt=NOW()

User un-reads
  → PUT read=false, readAt=null

Admin mark-all
  → UPDATE WHERE userId=session AND read=false
    SET read=true, readAt=NOW()
```

---

## 5. Channel Lifecycle

```
Outbox row: status=pending
  → Processor claims: status=processing, lock_time=NOW()
  → Provider call:
      success  → status=sent, sent_at=NOW()
      dry_run  → status=skipped
      deduped  → status=skipped
      capped   → if clearable: retry later; else status=failed (next-day schedule)
      failure  → attempts++, next_attempt_at=retry_schedule(attempts)
               → if attempts >= max_attempts: status=dead
  → Lock recovery: rows WHERE status=processing AND lock_time < NOW()-15min
      → reset to pending (will be re-claimed)
```

---

## 6. Outbox State Machine

```
pending ──(claim)──→ processing ──(success)──→ sent
                         │         ──(dry/dedup)→ skipped
                         │         ──(failure)──→ pending  [attempts < max]
                         │         ──(max)──────→ dead
                         │
stale lock (15min) → pending (recovery)

Admin requeue:  dead | failed → pending  (attempts reset)
```

---

## 7. Idempotency Rules

- `dedupe_key` on `notification_outbox` is UNIQUE per channel: `{rule_key}:{entity_id}:{user_id}:{channel}`
- `dedupe_key` on `notifications` is UNIQUE per user (partial, non-null only): `{rule_key}:{entity_id}:{user_id}`
- INSERT with conflicting `dedupe_key` uses `ON CONFLICT DO NOTHING` — business events are idempotent
- In-app and outbox rows are created in the same DB transaction to prevent partial delivery

---

## 8. Retry Policy

| Attempt | Delay |
|---------|-------|
| 1 | 1 minute |
| 2 | 5 minutes |
| 3 | 30 minutes |
| 4 | 2 hours |
| 5 | 12 hours |
| > max | dead |

Default max_attempts = 5. Can be overridden per outbox row at insert time.

---

## 9. Privacy Policy

- **Notification `sub` field**: name + Persian area label only. No phone, no resume, no answers.
- **Outbox `payload`**: `{ applicationId, ruleKey, recipientId }` — no PII.
- **Email body**: name, area label, and a panel link authenticated by session. No resume attachment, no phone, no answers.
- **SMS body**: `{title}\n{name} — {area}` — no phone of the applicant, no resume.
- **Error redaction**: SMTP errors and Kavenegar errors are redacted before storage (strip auth headers, URLs with keys, stack traces).
- **Admin delivery view**: recipient shown as masked (`09xx****xxxx`, `user@ex**.com`).
- **No null-user rows** created by V2 service (breaks shared read state gap).

---

## 10. API Contracts

### GET /api/notifications
```
Query: cursor?, filter=(all|unread|archived|info|warning|critical)?, limit=20 (max 50)
Auth: requireSession
Response: {
  notifications: NotificationV2[],
  nextCursor: string | null,
  unreadCount: number
}
NotificationV2: {
  id, type, title, sub, read, readAt, archivedAt,
  createdAt (ISO), actionUrl, entityId, ruleKey, priority
}
```

### PATCH /api/notifications
```
Body: { action: 'read'|'unread'|'archive'|'read-all', id?: string }
Auth: requireSession
Guard: WHERE id=? AND user_id=session.sub (for single-row)
       WHERE user_id=session.sub (for read-all)
Response: { ok: true, unreadCount: number }
```

### POST /api/internal/notifications/process
```
Headers: Authorization: Bearer {NOTIFICATION_PROCESSOR_SECRET}
Auth: constant-time secret comparison — NO session auth
Response: { processed: number, sent: number, failed: number, dead: number, skipped: number }
Never returns: payloads, addresses, provider responses, or secrets
```

### GET/PATCH /api/admin/notification-rules (extended)
```
Response adds: inAppEnabled, emailEnabled, providerAvailable
```

### GET /api/admin/notification-outbox
```
Query: status?, page=1, limit=20
Auth: requireAdmin
Response: { rows: OutboxRow[], total, counts: { pending, processing, failed, dead, sentToday, oldestPendingAgeMs } }
OutboxRow: { id, channel, ruleKey, status, attempts, maxAttempts, redactedError, createdAt, nextAttemptAt, sentAt }
NO: recipientId, payload, providerResponse
```

### POST /api/admin/notification-outbox/[id]/requeue
```
Auth: requireAdmin
Effect: dead|failed → pending, attempts reset, next_attempt_at=NOW()
Never sends immediately
```

---

## 11. Rollout Order

1. Apply migration (idempotent)
2. Verify schema
3. Deploy application
4. Configure NOTIFICATION_PROCESSOR_SECRET in Liara env
5. Verify in-app only (no outbox rows expected until SMS/email channels enabled)
6. Configure SMTP variables
7. Verify SMTP connection (verify endpoint, no email sent)
8. Configure Liara scheduler → POST /api/internal/notifications/process every 5 minutes
9. Enable email per rule
10. Enable SMS per rule
11. Monitor outbox

---

## 12. Non-Destructive Rollback Plan

**Emergency rollback (no schema changes needed):**
1. Disable master toggle for all rules → no new outbox rows
2. Stop Liara scheduler → processor stops running
3. Roll application back to previous build via Liara dashboard
4. Existing outbox rows remain but are not processed
5. In-app notifications continue to work (schema is additive)

**Schema rollback (only if required and data loss is acceptable):**
- `notification_outbox` can be dropped (no FK dependencies from other tables)
- New columns on `notifications` and `notification_rules` are nullable — removing them requires migration
- Prefer disabling features over dropping tables

**V1 backward compatibility:**
- `lib/notify.ts` exports remain unchanged
- `time` field still written (V1 clients read it)
- `read` field still written (V1 clients read it)
- Legacy `userId=null` rows are not deleted — they are simply excluded from V2 GET responses
