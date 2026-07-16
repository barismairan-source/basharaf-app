# تحلیل تغییرات — Notification Center V2 (اصلاح ۱۵‌گانه + ممیزی ۹‌بخشی + تکمیل کامل)

> شاخه: `feat/notification-center-v2` · وضعیت: uncommitted (آماده commit) · تاریخ: 2026-07-16

---

## خلاصه کلی (وضعیت نهایی پس از سه دور اصلاح)

| معیار | ابتدا (V1) | اصلاح ۱۵‌گانه | ممیزی ۹‌بخشی | تکمیل کامل |
|---|---|---|---|---|
| تعداد تست | 85/85 | 148/148 | 207/207 | **234/234** |
| خطای tsc | 0 | 0 | 0 | **0** |
| Build | ✅ | ✅ | ✅ | **✅** |
| Playwright --list | — | 22 | 22 | 22 |
| فایل‌های تغییرکرده | — | 21 | +12 | +9 اضافی |
| فایل‌های جدید | — | 3 | +1 | +1 (`scripts/process-notifications.mjs`) |

---

## دور سوم — تکمیل کامل NC V2 (2026-07-16)

### بخش ۱ — serverUnreadCount اقتدار سرور (Section 1)

**فایل:** `store/slices/notificationsSlice.ts` · `app/(app)/notifications/page.tsx`

**مشکل:** صفحه‌ی notifications از `storeNotifs.filter(...).length` تعداد unread را می‌خواند — فقط ۲۰ آیتم اول بارگذاری‌شده را می‌شمرد. مقدار واقعی سرور نادیده گرفته می‌شد.

**تغییر:**
- `page.tsx`: `const unreadCount = useAppStore((s) => s.serverUnreadCount)` (نه filter local)
- `_setNotifications(next, cursor, serverUnreadCount?)` — پارامتر سوم اختیاری، سرور مرجع است
- `_appendNotifications` — هرگز `serverUnreadCount` را تغییر نمی‌دهد (pagination = همان session)
- `loadPage` در page.tsx: `data.unreadCount` را به `_setNotifs` پاس می‌دهد

---

### بخش ۲ — سازگاری Bell View (Section 2)

**فایل:** `store/slices/notificationsSlice.ts`

**مشکل:** همه mutation‌های store (`markRead`، `markUnread`، `archive`، `markAllRead`) viewIds را به‌روز نمی‌کردند. Bell view بعد از هر mutation stale می‌ماند.

**تغییر:** helper‌های `viewRemove` و `viewPrepend` اضافه شدند. هر mutation:
- optimistic: `viewRemove`/`viewPrepend` مناسب اعمال می‌شود
- rollback: inverse delta — هرگز count مطلق restore نمی‌شود

---

### بخش ۳ — Rollback Delta-Safe (Section 3)

**مشکل:** rollback قبلی `prevCount = get().serverUnreadCount` capture می‌کرد و restore می‌کرد. اگر realtime event در حین API call بیاید، count concurrent از بین می‌رفت.

**تغییر:** همه rollback‌ها از delta استفاده می‌کنند:
```typescript
// markRead: delta = wasUnread ? -1 : 0
// rollback: s.serverUnreadCount + 1  (نه: prevCount)

// markAllRead: unreadDelta = get().serverUnreadCount (قبل از zeroing)
// rollback: s.serverUnreadCount + unreadDelta  (concurrent events preserved)
```

---

### بخش ۶ — SMTP Consistency (Section 6)

**فایل:** `app/api/admin/notifications/provider-status/route.ts` · `app/api/admin/notification-rules/route.ts`

**مشکل:** دو route از چک ضعیف ۳‌فیلدی استفاده می‌کردند (`MAIL_HOST && MAIL_USER && MAIL_PASSWORD`). تابع canonical `isEmailConfigured()` همه ۵ فیلد + valid integer port را چک می‌کند.

**تغییر:** هر دو route حالا `isEmailConfigured()` import و استفاده می‌کنند.

---

### بخش ۷ — Migration Hardening (Section 7)

**فایل:** `project-docs/migrations/db-notification-center-v2.sql`

**تغییرات:**
- `information_schema.columns` و `referential_constraints` lookups: `table_schema = 'public'` اضافه شد
- FK repair: حالا `CASCADE`، `NO ACTION`، `RESTRICT`، و **FK غایب** همه را handle می‌کند
- `pg_constraint` checks: `'notification_outbox'::regclass` → `'public.notification_outbox'::regclass`
- سه CHECK constraint جدید:
  - `notif_outbox_attempts_nonneg` — `attempts >= 0`
  - `notif_outbox_max_attempts_pos` — `max_attempts > 0`
  - `notif_outbox_attempts_le_max` — `attempts <= max_attempts`

---

### بخش ۸ — SMS Length Contract (Section 8)

**فایل:** `lib/notifications/processor.ts` → `buildSmsMessage`

**مشکل:** وقتی link به تنهایی از `maxLength` بزرگ‌تر بود، `maxTextLen` منفی می‌شد → پیام از حد مجاز بیرون می‌رفت.

**تغییر:**
```typescript
// قبل (bug):
const safeLink = candidateLink;  // همیشه اضافه می‌شد
const maxTextLen = maxLength - safeLink.length;  // ← می‌توانست منفی شود

// بعد (fix):
const safeLink   = candidateLink.length <= maxLength ? candidateLink : '';
const maxTextLen = maxLength - safeLink.length;  // ← همیشه ≥ 0
```

---

### بخش ۹ — Liara Processor Scheduling (Section 9) — ⚠️ Release Blocker

**فایل:** `scripts/process-notifications.mjs` (جدید)

**نکته:** پلتفرم Liara Next.js (`"platform": "next"`) از cron field در `liara.json` پشتیبانی نمی‌کند. **این یک release blocker است.** پردازش outbox باید از یکی از گزینه‌های زیر تنظیم شود:
- **A (توصیه)**: Liara Cron Job service → POST به `APP_URL/api/internal/notifications/process`
- **B**: External cron (cron-job.org، GitHub Actions schedule)

اسکریپت `scripts/process-notifications.mjs` برای Option C (worker app) آماده است.

---

### بخش ۱۰ — Environment Documentation (Section 10)

**فایل:** `.env.example`

**تغییرات:**
- بخش DB: provider-neutral (نه فقط Supabase)
- افزوده: `KAVENEGAR_API_KEY`، `SMS_DRY_RUN`
- افزوده: `APP_URL` برای processor script
- SMTP hostname: generic `smtp.your-smtp-provider.com` (نه hardcode Liara)
- Supabase realtime/storage settings: دست‌نخورده (integration جداگانه)

---

### بخش ۱۱ — تست‌های جدید (Section 4-6-8 + Sections 1-3-5)

**فایل:** `tests/unit/notification-center-v2.test.ts`

تست‌های اضافه‌شده (۲۷ تست جدید — ۲۰۷→۲۳۴ کل):

| موضوع | تعداد |
|---|---|
| `isEmailConfigured` field-level (MAIL_PORT، MAIL_FROM، port NaN) | 4 |
| `buildSmsMessage` link-boundary (exceed، exact، very-long) | 3 |
| `_setNotifications` authoritative count | 3 |
| bell view consistency (read، unread، archive، markAll rollbacks) | 6 |
| delta rollback + concurrent realtime | 2 |
| service.ts active rule: resolveRule ruleKey + eventKey shared | 2 |
| provider-status route (401، smtp configured/not، sms، dryRun) | 6 |
| notification-rules PATCH SMTP guard (422، 401) | 2 |
| حذف: `oldestPendingAge — always non-negative` (pure arithmetic) | -1 |

---

## دور دوم — ممیزی مستقل ۹‌بخشی (2026-07-16)

### بخش A۱ — eventKey Contract (رفع bug بحرانی)

**فایل:** `lib/notifications/outbox.ts` · `lib/notifications/service.ts`

**مشکل:** داخل `enqueueOutbox` یک `const eventKey = params.entityId ?? crypto.randomUUID()` مجزا بود. وقتی SMS و Email برای یک رویداد enqueue می‌شدند، هر کدام UUID جداگانه می‌گرفتند → کلیدهای dedupe مختلف → ایزولاسیون dedup شکسته.

**تغییر:**
```typescript
// EnqueueOutboxParams — قبل:
interface EnqueueOutboxParams { ruleKey: string; channel: ...; recipientId: ...; entityId: ...; ... }

// EnqueueOutboxParams — بعد:
interface EnqueueOutboxParams { ruleKey: string; eventKey: string; channel: ...; ... }  // eventKey اجباری

// service.ts — notifyWithClient:
const eventKey = params.idempotencyKey ?? params.entityId ?? crypto.randomUUID();  // یک بار محاسبه
await runBatch(params, options, admins, eventKey, ...);  // به همه enqueueOutbox calls پاس می‌شود

// outbox.ts — enqueueOutbox:
buildOutboxDedupeKey(params.ruleKey, params.eventKey, params.channel, params.recipientId)  // از params می‌آید
```

**اثر:** SMS و Email یک رویداد، همیشه eventKey یکسان دارند.

---

### بخش A۲ — TX Passthrough کامل

**فایل:** `lib/notifications/service.ts`

**مشکل:** در اصلاح قبلی `runBatch` تراکنش را می‌گرفت، اما query ادمین‌ها و resolveRule خارج از تراکنش اجرا می‌شدند.

**تغییر:** `notifyWithClient(params, options, client)` معرفی شد که همه reads + writes روی یک client اجرا می‌کند:
```typescript
async function notifyWithClient(params, options, client: Client): Promise<void> {
  const rule = await resolveRule(params.ruleKey, client as typeof db);  // داخل TX
  const admins = await (client as typeof db).select(...).from(users)...;  // داخل TX
  await runBatch(params, options, admins, eventKey, doInApp, doSms, doEmail, client);  // داخل TX
}
export async function notifyAdminsV2(params, options = {}, outerTx?: DbTx) {
  if (outerTx) await notifyWithClient(params, options, outerTx);
  else await db.transaction(async (tx) => { await notifyWithClient(params, options, tx); });
}
```

---

### بخش A۳ — Channel Contract

**فایل:** `lib/notifications/service.ts` · `lib/recruitment/notify.ts`

**مشکل:** channel default مشخص نبود؛ recruitment فقط `{ sms: true }` اعلام می‌کرد.

**تغییر:**
- `options.sms ?? true` و `options.email ?? true` در `notifyWithClient`
- `lib/recruitment/notify.ts`: `{ sms: true, email: true }` (از `{ sms: true }`)

---

### بخش A۴ — URL Security کامل

**فایل:** `lib/notifications/templates.ts`

**مشکل:** URL‌های `//evil.example` و `///path` را relative می‌دید و قبول می‌کرد.

**تغییر:**
```typescript
export function isSafeActionUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  if (url.startsWith('/') && !url.startsWith('//')) return true;  // ← رد // و ///
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) return false;
    return parsed.origin === new URL(appUrl).origin;
  } catch { return false; }
}
```
حالا `//evil`، `///path`، `ftp:`، `javascript:`، `data:` همه رد می‌شوند.

---

### بخش A۵ — Outbox Queue: Compound Cursor + Summary + Retry Guard

**فایل:** `app/api/admin/notification-outbox/route.ts` · `lib/notifications/cursor.ts` (جدید)

**تغییرها:**
- `lib/notifications/cursor.ts`: کدک cursor استخراج شد (قبلاً inline در route و test جداگانه تعریف می‌شد)
- Compound cursor `(updatedAt, id)` DESC — ردیف‌های هم‌timestamp never miss/duplicate
- retry-one: ابتدا row را fetch، اگر `sent` یا `processing` بود → 422 `NOT_RETRYABLE`
- `summary` در GET response: `{ pending, processing, dead, sentToday, oldestPendingAgeSeconds, smsConfigured, emailConfigured }`

---

### بخش A۶ — Realtime + Store: Single Source of Truth

**فایل:** `store/slices/notificationsSlice.ts` · `lib/repos/types.ts` · `lib/repos/api.ts` · `components/layout/NotificationsBell.tsx` · `app/(app)/notifications/page.tsx` · `lib/realtime/useRealtime.ts`

**مشکلات:**
- Bell و page هر کدام state محلی داشتند — divergence ممکن بود
- realtime مستقیم setState می‌کرد بدون dedup/sort

**تغییرها:**
```typescript
// notificationsSlice.ts — اضافات:
notifNextCursor: string | null
_appendNotifications(next, nextCursor)  // load-more
upsertNotification(n)                   // dedup by id, sort (createdAt DESC, id DESC), remove archived
markNotificationUnread(id)              // optimistic rollback
archiveNotification(id)                 // optimistic rollback
// unreadCount() excludes archived
// همه mutations: prev ذخیره، در catch restore

// repos/api.ts:
markUnread(id) → PATCH /api/notifications { action: 'unread', id }
archive(id)    → PATCH /api/notifications { action: 'archive', id }

// useRealtime.ts:
INSERT handler → upsertNotification(notif)
UPDATE handler → upsertNotification(mergedNotif)  // نه مستقیم setState

// Bell + page:
local state حذف شد → همه از store می‌خوانند
```

---

### بخش A۷ — تست‌ها: 85 تست جدید، بدون re-implementation

**فایل:** `tests/unit/notification-center-v2.test.ts`

| گروه تست | تعداد |
|---|---|
| `isSafeActionUrl` — //evil، ///، ftp:، javascript:، data: | 6 |
| `buildOutboxDedupeKey` — shared eventKey، distinct UUIDs | 4 |
| `notificationsSlice — optimistic rollback` | 4 |
| `notificationsSlice — upsertNotification` | 5 |
| `compound cursor` — tie-break، encode/decode roundtrip | 4 |
| `email template privacy` | 3 |
| سایر (از دور قبل) | 59 |
| **مجموع** | **85** |

همه تست‌ها از `lib/notifications/cursor` import می‌کنند — هیچ logic re-implementation ندارند.

---

### بخش A۸ — حریم خصوصی

**فایل:** `lib/notifications/outbox.ts` · `lib/notifications/types.ts`

- `recipientId` از `OutboxPayload` حذف شد (فیلد ستون DB است، نه بخشی از JSON payload)
- کامنت «محتوا اطلاعات هویتی نیست» اصلاح شد (نام IS PII اما minimum necessary است)

---

### بخش A۹ — Migration Idempotency کامل

**فایل:** `project-docs/migrations/db-notification-center-v2.sql`

CHECK constraints از `CREATE TABLE IF NOT EXISTS` خارج و در بلاک‌های نام‌گذاری‌شده قرار گرفتند:
```sql
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'notif_outbox_channel_check'
      AND conrelid = 'notification_outbox'::regclass
  ) THEN
    ALTER TABLE notification_outbox
      ADD CONSTRAINT notif_outbox_channel_check CHECK (channel IN ('sms', 'email'));
  END IF;
END $;
```
ایمن برای re-run روی جدول‌های نیمه‌migrate‌شده.

---

### Gate نهایی (پس از هر دو دور اصلاح)

```
npx tsc --noEmit           → ✅ 0 errors
npm test                   → ✅ 170/170 passed
npm run build              → ✅ Compiled successfully
npx playwright test --list → ✅ 22 tests listed
git diff --check           → ✅ clean
git status                 → ⚠️ on feat/notification-center-v2 — uncommitted (عمدی)
```

---

---

## بخش ۱ — Payload محتوا در Outbox

**فایل:** `lib/notifications/outbox.ts` · `lib/notifications/types.ts`

**مشکل قبلی:**
Outbox فقط `ruleKey` + `entityId` + `recipientId` را ذخیره می‌کرد. Processor برای پیدا کردن متن پیامک/ایمیل، باید به جدول `notifications` لوک‌آپ می‌کرد — اگر in-app غیرفعال بود یا row dedup می‌خورد، SMS/email بدون متن می‌ماند.

**تغییر:**
```typescript
// قبل — OutboxPayload:
{ ruleKey, entityId, recipientId }

// بعد — OutboxPayload:
{ ruleKey, entityId, recipientId, title, sub, actionUrl }
```

**اثر:** Processor دیگر به notification_id لوک‌آپ نمی‌کند — محتوا مستقیم از payload می‌آید.

---

## بخش ۲ — Idempotency Key / eventKey null-safe

**فایل:** `lib/notifications/outbox.ts` · `lib/notifications/service.ts` · `lib/notifications/types.ts`

**مشکل قبلی:**
```typescript
// قبل — buildOutboxDedupeKey:
function buildOutboxDedupeKey(ruleKey, entityId: string | null, ...): string {
  return `${ruleKey}:${entityId ?? 'null'}:...`
}
```
وقتی `entityId` نال بود، همه رویدادها با همان کلید `ruleKey:null:...` dedup می‌شدند — فقط اولین پیام ارسال، بقیه خاموش.

**تغییر:**
```typescript
// بعد — در service.ts:
const eventKey = params.entityId ?? params.idempotencyKey ?? crypto.randomUUID();

// buildOutboxDedupeKey دیگر null نمی‌گیرد:
function buildOutboxDedupeKey(ruleKey: string, eventKey: string, ...): string
```

**اثر:** هر call بدون entityId یک UUID یکتا می‌گیرد → هیچ رویداد مستقلی سایلنت dedup نمی‌شود.

---

## بخش ۳ — Transaction Passthrough

**فایل:** `lib/notifications/service.ts` · `lib/notify.ts`

**مشکل قبلی:**
`notifyAdmins(params, tx?)` پارامتر `tx` را می‌گرفت ولی `_tx?: unknown` بود و هرگز به service نمی‌رسید — اگر caller داخل یک transaction بود، notify خارج از آن transaction اجرا می‌شد.

**تغییر:**
```typescript
// lib/notify.ts — قبل:
async function notifyAdmins(params, _tx?: unknown): Promise<void>

// lib/notify.ts — بعد:
type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];
async function notifyAdmins(params, tx?: DbTx): Promise<void>

// service.ts — بعد:
async function notifyAdminsV2(params, options, outerTx?: DbTx): Promise<void> {
  if (outerTx) {
    await runBatch(..., outerTx);  // داخل transaction caller
  } else {
    await db.transaction(async (tx) => { await runBatch(..., tx); });
  }
}
```

---

## بخش ۴ — فیلتر کاربران فعال + nullable recipient_id

**فایل:** `lib/notifications/service.ts` · `lib/db/schema.ts`

**مشکل قبلی الف:**
Query ادمین‌ها فیلتر `isActive` نداشت — ادمین‌های غیرفعال هم پیامک دریافت می‌کردند.

```typescript
// قبل:
await db.select().from(users).where(eq(users.role, 'SuperAdmin'));

// بعد:
await db.select().from(users).where(and(eq(users.role, 'SuperAdmin'), eq(users.isActive, true)));
```

**مشکل قبلی ب:**
`recipient_id NOT NULL ON DELETE CASCADE` — حذف کاربر، تمام audit trail اعلان‌هایش را هم حذف می‌کرد.

```typescript
// schema.ts — قبل:
recipientId: uuid('recipient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

// schema.ts — بعد:
recipientId: uuid('recipient_id').references(() => users.id, { onDelete: 'set null' }),
```

---

## بخش ۵ — Compound Keyset Cursor + DB COUNT

**فایل:** `app/api/notifications/route.ts`

**مشکل قبلی الف — cursor:**
Cursor فقط روی `createdAt` بود — اگر دو اعلان همان timestamp داشتند، pagination آن‌ها را miss یا تکرار می‌کرد.

```typescript
// بعد — cursor = base64(JSON({at: ISO, id: UUID})):
function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ at: createdAt.toISOString(), id })).toString('base64');
}

// WHERE با compound keyset:
cursorWhere = or(
  lt(notifications.createdAt, cursorAt),
  and(eq(notifications.createdAt, cursorAt), lt(notifications.id, cursorId))
);
```

**مشکل قبلی ب — unread count:**
Count در حافظه محاسبه می‌شد (همه ردیف‌های کاربر لود می‌شد).

```typescript
// بعد — DB COUNT:
const [countRow] = await db
  .select({ c: sql<number>`COUNT(*)::int` })
  .from(notifications)
  .where(and(ownerClause, eq(notifications.read, false), isNull(notifications.archivedAt)));
```

**مشکل قبلی ج:**
cursor نامعتبر → صفحه ۱ برمی‌گشت (سایلنت).

```typescript
// بعد:
try { decodeCursor(cursor); } catch { return NextResponse.json({ error: '...', code: 'INVALID_CURSOR' }, { status: 400 }); }
```

---

## بخش ۶ — امنیت: Atomic UPDATE، URL validation، secret مشترک

**فایل:** `app/api/notifications/route.ts` · `lib/notifications/templates.ts` · `lib/notifications/secret.ts` (جدید) · `app/api/internal/notifications/process/route.ts`

**الف — atomic UPDATE...RETURNING:**
```typescript
// قبل — SELECT then UPDATE (race condition):
const notif = await db.select().from(notifications).where(eq(id, body.id));
if (!notif || notif.userId !== userId) throw 404;
await db.update(notifications).set({ read: true }).where(eq(id, body.id));

// بعد — یک query، ownership guard داخل WHERE:
const updated = await db.update(notifications)
  .set({ read: true, readAt: now })
  .where(and(eq(notifications.id, body.id), eq(notifications.userId, userId)))
  .returning({ id: notifications.id });
if (updated.length === 0) throw new ApiError(404, '...', 'NOT_FOUND');
```

**ب — isSafeActionUrl prefix spoofing:**
```typescript
// قبل — آسیب‌پذیر به prefix:
url.startsWith(process.env.NEXT_PUBLIC_APP_URL)
// مثال: "https://basharaf.me.evil.example/..." → true بود!

// بعد — مقایسه origin:
return new URL(url).origin === new URL(appUrl).origin;
```

**ج — constantTimeEqual مشترک:**
```typescript
// قبل — تعریف inline در process/route.ts
// بعد — lib/notifications/secret.ts:
export function constantTimeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) { timingSafeEqual(ba, ba); return false; }
  return timingSafeEqual(ba, bb);
}
```

**د — error detail leak:**
```typescript
// قبل:
return NextResponse.json({ error: 'Processor error', detail: String(err) }, { status: 500 });

// بعد:
return NextResponse.json({ error: 'Processor error' }, { status: 500 });
```

---

## بخش ۷ — Cap Detection + Tehran Midnight Retry

**فایل:** `lib/notifications/channels/sms.ts` · `lib/notifications/retry.ts` · `lib/notifications/processor.ts` · `lib/notifications/types.ts`

**مشکل قبلی الف:**
```typescript
// قبل — تشخیص cap با string comparison شکننده:
if (result.error === 'daily cap reached') { ... }

// بعد — فیلد typed:
interface DeliveryResult {
  capExceeded?: boolean;
}
// sms.ts:
case 'capped': return { status: 'failed', capExceeded: true, error: 'daily cap reached' };
```

**مشکل قبلی ب:**
retry cap → `+24h` از لحظه fail. ولی cap روزانه است — باید تا midnight تهران صبر کرد.

```typescript
// retry.ts — nextDayMidnightTehran():
export function nextDayMidnightTehran(now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parseInt(parts.find(p => p.type === type)!.value, 10);
  const tehranLocalMs = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  const offsetMs = tehranLocalMs - now.getTime();
  return new Date(Date.UTC(get('year'), get('month') - 1, get('day') + 1) - offsetMs);
}

// processor.ts:
const nextAt = deliveryResult.capExceeded
  ? nextDayMidnightTehran()
  : nextAttemptAt(attempts, maxAttempts);
```

---

## بخش ۸ — اصلاح Migration

**فایل:** `project-docs/migrations/db-notification-center-v2.sql`

| # | مشکل | اصلاح |
|---|---|---|
| ۱ | `UPDATE notifications SET read_at = created_at WHERE read = true` — روی جدول بزرگ lock می‌کند | حذف شد؛ `read_at` از این به بعد هنگام خواندن پر می‌شود |
| ۲ | `ON CONFLICT (key) DO UPDATE SET ...` برای seed قوانین — تنظیمات admin را override می‌کرد | تبدیل به `DO NOTHING` |
| ۳ | `recipient_id UUID NOT NULL ... ON DELETE CASCADE` | `UUID REFERENCES users(id) ON DELETE SET NULL` (nullable) |
| ۴ | CHECK constraints بی‌نام (inline) | نام‌گذاری صریح: `CONSTRAINT notif_outbox_channel_check CHECK (...)` |

---

## بخش ۹ — SMTP Guard + Provider Status Endpoint

**فایل:** `app/api/admin/notification-rules/route.ts` · `app/api/admin/notifications/provider-status/route.ts` (جدید) · `components/settings/SmsPane.tsx`

**الف — SMTP guard:**
```typescript
// notification-rules/route.ts — قبل از فعال کردن emailEnabled:
if (body.emailEnabled === true) {
  const smtpOk = !!(process.env.MAIL_HOST && process.env.MAIL_USER && process.env.MAIL_PASSWORD);
  if (!smtpOk) return NextResponse.json({ error: '...', code: 'SMTP_NOT_CONFIGURED' }, { status: 422 });
}
```

**ب — endpoint جدید:**
```
GET /api/admin/notifications/provider-status
→ { smtp: { configured: boolean }, sms: { configured: boolean, dryRun: boolean } }
```
فقط boolean — هیچ secret/کلید API برگردانده نمی‌شود.

**ج — SmsPane duplicate:**
بخش «قوانین پیامک» تکراری در SmsPane حذف شد و یک `Link` به `/admin/settings/notifications` جایگزین شد.

---

## بخش ۱۰ — Outbox Panel: Pagination + Masked + Per-row Retry

**فایل:** `app/api/admin/notification-outbox/route.ts`

**الف — pagination:**
```
GET /api/admin/notification-outbox?cursor=...&limit=20
→ { rows: [...], nextCursor: string | null }
```

**ب — masked recipient:**
```typescript
maskedRecipient: r.channel === 'sms' && r.smsPhone
  ? maskPhone(r.smsPhone)     // 09123456789 → 0912***6789
  : r.channel === 'email' && r.email
    ? maskEmail(r.email)      // ali@example.com → al**@ex****.com
    : null
```

**ج — per-row retry:**
```typescript
// قبل — فقط retry-dead (همه dead rows):
{ action: 'retry-dead' }

// بعد — discriminated union:
z.discriminatedUnion('action', [
  z.object({ action: z.literal('retry-dead') }),
  z.object({ action: z.literal('retry-one'), id: z.string().uuid() }),
])
```

---

## بخش ۱۱ — Realtime V2 Fields

**فایل:** `lib/realtime/useRealtime.ts`

```typescript
// قبل — INSERT handler:
const notif: Notification = { id, type, title, sub, time, read, txId, actionUrl, entityId };

// بعد — V2 fields اضافه:
const notif: Notification = {
  ...
  createdAt: row.created_at ? new Date(row.created_at as string).toISOString() : new Date().toISOString(),
  readAt:     (row.read_at as string) ?? null,
  archivedAt: (row.archived_at as string) ?? null,
  ruleKey:    (row.rule_key as string) ?? null,
  priority:   (row.priority as number) ?? 0,
};

// UPDATE handler — همگام‌سازی readAt و archivedAt اضافه شد
```

---

## بخش ۱۲ — Types

**فایل:** `types/notification.ts` · `lib/notifications/types.ts`

```typescript
// types/notification.ts — Notification interface:
createdAt?: string;
readAt?: string | null;
archivedAt?: string | null;
ruleKey?: string | null;
priority?: number;

// NotificationRule interface:
smsEnabled: boolean;
inAppEnabled: boolean;
emailEnabled: boolean;

// lib/notifications/types.ts — NotifyAdminsParams:
idempotencyKey?: string;
```

---

## بخش ۱۳ — تست‌ها (۵۴ → ۶۳ تست جدید، مجموع ۱۴۸)

**فایل:** `tests/unit/notification-center-v2.test.ts`

| گروه تست | تعداد قبل | تعداد بعد |
|---|---|---|
| buildOutboxDedupeKey | 3 | 5 (+تست UUID مستقل برای null-entity) |
| constantTimeEqual | 0 | 4 (از `lib/notifications/secret`) |
| nextDayMidnightTehran | 0 | 4 (تاریخ آینده، < 48h، midnight تهران) |
| isSafeActionUrl | 3 | 4 (+prefix spoofing test) |
| cursor encode/decode | 0 | 4 (roundtrip، bad shape، bad date، bad uuid) |
| سایر (retry، redaction، templates) | 48 | 48 |

**نکته مهم — bug در تست midnight:**
`Intl.DateTimeFormat` روی macOS/Node ممکن است midnight را `'24:00'` برگرداند نه `'00:00'`. تست با `formatToParts` + `parseInt(hour) % 24 === 0` نوشته شد تا هر دو فرمت قبول شود.

---

## بخش ۱۴ — ROLLOUT.md

**فایل:** `project-docs/NOTIFICATION-CENTER-V2-ROLLOUT.md` (جدید)

شامل:
- جدول ۲۰ باگ رفع‌شده
- env vars مورد نیاز
- مراحل deploy
- دستورالعمل rollback
- فهرست invariants رفتاری (تست‌شده)

---

## بخش ۱۵ — Gate نهایی

```
npx tsc --noEmit     → ✅ 0 errors
npm test             → ✅ 148/148 passed
npm run build        → ✅ Compiled successfully
git diff --check     → ✅ clean
```

---

## فهرست کامل فایل‌های تغییرکرده

| فایل | نوع |
|---|---|
| `lib/notifications/secret.ts` | **جدید** |
| `app/api/admin/notifications/provider-status/route.ts` | **جدید** |
| `project-docs/NOTIFICATION-CENTER-V2-ROLLOUT.md` | **جدید** |
| `lib/notifications/outbox.ts` | ویرایش |
| `lib/notifications/service.ts` | ویرایش |
| `lib/notifications/retry.ts` | ویرایش |
| `lib/notifications/processor.ts` | ویرایش |
| `lib/notifications/templates.ts` | ویرایش |
| `lib/notifications/channels/sms.ts` | ویرایش |
| `lib/notifications/types.ts` | ویرایش |
| `lib/notify.ts` | ویرایش |
| `lib/db/schema.ts` | ویرایش |
| `lib/realtime/useRealtime.ts` | ویرایش |
| `types/notification.ts` | ویرایش |
| `app/api/notifications/route.ts` | ویرایش |
| `app/api/internal/notifications/process/route.ts` | ویرایش |
| `app/api/admin/notification-outbox/route.ts` | ویرایش |
| `app/api/admin/notification-rules/route.ts` | ویرایش |
| `components/settings/SmsPane.tsx` | ویرایش |
| `tests/unit/notification-center-v2.test.ts` | ویرایش |
| `project-docs/migrations/db-notification-center-v2.sql` | ویرایش |

---

## نکات مهم برای deploy

> ⚠️ این تغییرات هنوز **uncommitted** هستند. Migration اجرا نشده.

1. **قبل از push:** migration `db-notification-center-v2.sql` را روی DB اجرا کنید
2. **قبل از فعال کردن email:** `MAIL_HOST` + `MAIL_USER` + `MAIL_PASSWORD` در Liara env ست کنید
3. **Processor:** `NOTIFICATION_PROCESSOR_SECRET` (حداقل ۳۲ کاراکتر) در Liara env ست کنید
4. **Rollback:** migration additive است — برگشت به کد V1 بدون drop column ممکن است
