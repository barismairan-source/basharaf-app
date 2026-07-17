# HANDOFF.md — دفتر وضعیت زنده‌ی پروژه «با شرف»

> قانون طلایی: **هر جلسه اول بخش ۰ را بخوان؛ آخر جلسه بخش ۰ + ژورنال را به‌روز کن و commit/push کن.**
> جزئیات تاریخی قدیمی‌تر: `project-docs/handoff-archive.md`.

---

## ⚡ بخش ۰ — وضعیت لحظه‌ای (اول این را بخوان)

| | |
|---|---|
| **نسخه** | `0.28.1` |
| **آخرین به‌روزرسانی** | 2026-07-18 |
| **Build/tsc** | tsc ✅ ۰ خطا · tests 238/238 ✅ · build ✅ |
| **دیپلوی** | ✅ V2 کامل روی main + production: env vars تنظیم شده، migration تأیید شد، merge/push انجام شده. |
| **کار نیمه‌تمام (in-progress)** | — |
| **کار بعدی پیشنهادی** | بعد از دیپلوی این commit، لاگ‌های Liara را چند دقیقه بعد چک کن که scheduler داخلی (`instrumentation.ts`) هر ۱ دقیقه در حال tick زدنه بدون خطا. |
| **بلاک‌شده/منتظر کاربر** | Playwright e2e ⛔ — `.env.e2e` غایب |

> ⚠️ **نکته مهم برای جلسات بعدی:** فرم `/apply` حالا کاملاً داینامیک و دیتابیس‌محور است. **دیگر فیلد hard-code به `app/apply/page.tsx` یا `lib/recruitment/` اضافه نکنید.** همه فیلدهای جدید باید از طریق `/recruitment/form-builder` ایجاد شوند.

---

## 📋 پروتکل جلسه

### شروع هر جلسه (الزامی — به ترتیب)
⛔ **تنها یک نشست فعال Claude Code مجاز است روی این پوشه ویرایش کند — دو نشست همزمان باز نکن.**
1. این فایل، بخش ۰ + جدیدترین ورودی ژورنال را بخوان.
2. `git status` بزن — اگر تغییرات commit‌نشده هست، یعنی جلسه‌ی قبل ناقص بسته شده: اول وضعیت را با کاربر روشن کن، چیزی را کورکورانه commit یا revert نکن.
3. `git log -5 --oneline` — تطبیق بده با ژورنال.
4. به کاربر خلاصه بگو: «وضعیت X است، کار نیمه‌تمام Y، پیشنهاد بعدی Z» و منتظر تأیید بمان.

### پایان هر جلسه / بعد از هر تغییر معنادار (الزامی)
1. یک ورودی ژورنال با **قالب زیر** به بالای بخش ژورنال اضافه کن.
2. بخش ۰ را به‌روز کن (نسخه، تاریخ، کار نیمه‌تمام، کار بعدی).
3. اگر ژورنال بیش از **۷ ورودی** شد، قدیمی‌ها را به `project-docs/handoff-archive.md` منتقل کن.
4. `git add -A && git commit -m "..." && git push` — **بدون push جلسه را نبند.**
5. ⛔ **دیگر ZIP نساز** — GitHub Actions خودکار deploy می‌کند (از 2026-06-24).

### قالب اجباری ورودی ژورنال
```markdown
## 📓 [تاریخ] — [عنوان کوتاه]
**چه شد:** (۲–۵ خط، تصمیم‌های مهم + چرایی)
**فایل‌ها:** (مسیر کامل ایجاد/ویرایش‌شده‌ها)
**Build:** tsc/build سبز یا خطا + متن خطا
**ناتمام:** دقیقاً کجا متوقف شد، چه چیزی نیمه‌کاره است (اگر هیچ: «—»)
**برای جلسه‌ی بعد:** کار بعدی مشخص + هر هشداری که جلسه‌ی بعد باید بداند
```

---

## 🏗 بخش ۴ — مرجع پایدار (قبل از دست‌زدن به مالی بخوان)

- `accounts.balance` فیلد **cache** است: همیشه از reverse transaction‌ها محاسبه شده. هر تراکنش معکوس جا مانده = drift دائمی.
- ⚠ **INVARIANT فاز ۵**: `accounts.balance` هرگز توسط فیلتر `is_setup` (لنز عملیاتی) تغییر نمی‌کند. این فیلتر فقط روی KPI‌های جریان مالی (income/expense/profit) در داشبورد و گزارش‌ها اثر دارد — ترازنامه مستقل است.
- پول **bigint تومان** در DB؛ در TypeScript `number` (JS safe integer تا ۹۰۰۰ تریلیون کافی است).
- تاریخ کاربری **جلالی text** (مثل `۱۴۰۳-۰۴-۱۵`)؛ تاریخ داخلی `timestamp` میلادی.
- `JWT_SECRET` حتماً ≥۳۲ کاراکتر.
- فرم `/apply` کاملاً داینامیک — فیلد hard-code اضافه نکن.

---

## 📓 ژورنال نشست‌ها (جدیدترین بالا — حداکثر ۷ ورودی)

## 📓 2026-07-18 — راه‌اندازی NC V2 در production + scheduler لوکال داخل‌پروسه (v0.28.1)
**چه شد:** ۱) تأیید شد env vars (`NEXT_PUBLIC_APP_URL`, `NOTIFICATION_PROCESSOR_SECRET`, `MAIL_*` Resend) قبلاً در پنل Liara ست شده بودن. ۲) تأیید شد `feat/notification-center-v2` قبلاً به `main` merge/push شده و دیپلوی موفق بوده. ۳) migration `db-notification-center-v2.sql` روی production DB تأیید شد که قبلاً اجرا شده (خروجی "already exists, skipping" برای همه‌ی ستون‌ها/ایندکس‌ها). ۴) تلاش برای scheduler خارجی (cron-job.org) با timeout مواجه شد — علت احتمالی: عدم دسترسی شبکه‌ی سرویس‌های بین‌المللی به هاست ایرانی Liara (تحریم/فیلترینگ). GET مستقیم از مرورگر کاربر به همون آدرس بلافاصله ۴۰۵ برگردوند (یعنی سرور کاملاً سالم و در دسترس بود، فقط دسترسی cron-job.org مشکل داشت). ۵) **راه‌حل نهایی:** فایل `instrumentation.ts` در ریشه‌ی پروژه اضافه شد — با هوک `register()` نیتیو Next.js 14، وقتی سرور بالا میاد یک `setInterval` هر ۶۰ ثانیه مستقیم `processOutboxBatch()` را در همان پروسه صدا می‌زند (بدون هیچ HTTP call یا سرویس بیرونی — کاملاً لوکال، مصون از هر مشکل شبکه‌ی بین‌المللی). دارای guard تکرارنشدن هم‌زمان (`isRunning`) و try/catch با `logEvent`. Endpoint `/api/internal/notifications/process` دست‌نخورده باقی ماند (برای trigger دستی/آینده).
**چه شد (ادامه):** حین verify کردن دیپلوی، ۲ تست `nextDayMidnightTehran` fail شدن (preexisting، نه از تغییر بالا). ریشه‌یابی شد: `Intl.DateTimeFormat` با `hour12: false` درست در ساعت نیمه‌شب تهران، مقدار ساعت را `24` برمی‌گرداند (نه `00` — quirk شناخته‌شده‌ی ICU)، که باعث می‌شد محاسبه‌ی offset تهران ۲۴ ساعت اضافه حساب شود و نتیجه در گذشته بیفتد. این باگ می‌توانست job تست `unit-test` در GitHub Actions را دقیقاً حوالی نیمه‌شب fail کند و **دیپلوی را بلاک کند** (چون `deploy` به `unit-test` وابسته است) — پس در همین جلسه رفع شد: در `lib/notifications/retry.ts`، `hour12: false` به `hourCycle: 'h23'` تغییر کرد + نرمال‌سازی دفاعی `% 24` روی مقدار ساعت.
**فایل‌ها:** `instrumentation.ts` (جدید)، `lib/notifications/retry.ts`، `HANDOFF.md`، `package.json`، `package-lock.json`
**Build:** tsc ✅ ۰ خطا · build ✅ · tests 238/238 ✅
**ناتمام:** بعد از push، هنوز لاگ production را برای اولین tickهای موفق scheduler چک نکرده‌ایم.
**برای جلسه‌ی بعد:** ۱) چند دقیقه بعد از دیپلوی، لاگ‌های Liara (`liara logs`) را چک کن که scheduler داخلی بدون خطا در حال اجراست. ۲) اگر cron-job.org job ساخته شده، حذفش کن چون دیگر لازم نیست.

## 📓 2026-07-17 — اصلاح release-blocker — هم‌راستایی processor secret و scheduler (v0.28.0)
**چه شد:** ۴ اصلاح release-blocker: ۱) `scripts/process-notifications.mjs` از `PROCESSOR_SECRET` به `NOTIFICATION_PROCESSOR_SECRET` تغییر کرد (سه موضع: comment، `process.env.*`، error message). ۲) `.env.example` — `NEXT_PUBLIC_APP_URL=https://basharaf.me` (الزامی برای لینک‌های اعلان)؛ `APP_URL=https://basharaf.me` (فقط برای script، نه برای external cron). ۳) `ROLLOUT.md` — scheduler provider-neutral شد؛ قرارداد دقیق scheduler (POST / هر دقیقه / Authorization header / timeout <60s) جایگزین ادعای «Liara Cron Job service» شد. ۴) ۴ تست جدید اضافه شد (`processor secret contract`) که ثابت می‌کنند script و route هر دو از `NOTIFICATION_PROCESSOR_SECRET` استفاده می‌کنند و `process.env.PROCESSOR_SECRET` وجود ندارد. نتیجه: 234→238 تست.
**فایل‌ها:** `scripts/process-notifications.mjs`، `.env.example`، `project-docs/NOTIFICATION-CENTER-V2-ROLLOUT.md`، `tests/unit/notification-center-v2.test.ts`، `HANDOFF.md`
**Build:** tsc ✅ ۰ خطا · tests 238/238 ✅ · build ✅ · git diff --check ✅
**ناتمام:** migration اجرا نشده · env vars در Liara ست نشده · scheduler تنظیم نشده
**برای جلسه‌ی بعد:** ROLLOUT.md §1 step 5 بخوان → یک HTTP scheduler انتخاب کن → env vars → migration → merge.

## 📓 2026-07-16 — تکمیل کامل NC V2 — ۱۱ بخش + commit/push آماده (v0.28.0)
**چه شد:** تکمیل نهایی Notification Center V2 در ۱۱ بخش: ۱) `notificationsSlice.ts` بازنویسی کامل — `viewRemove`/`viewPrepend` helpers، `_setNotifications` با `serverUnreadCount?` اختیاری، همه mutationها viewIds را به‌روز می‌کنند، rollback delta-based (نه absolute restore). ۲) `page.tsx` — `serverUnreadCount` از store (نه filter local). ۳+۴) `provider-status/route.ts` + `notification-rules/route.ts` — `isEmailConfigured()` canonical. ۵) `channels/email.ts` — JSDoc اصلاح شد. ۶) `processor.ts` — `buildSmsMessage` link-too-long bug رفع شد. ۷) `db-notification-center-v2.sql` — schema-qualified catalog checks، FK repair برای CASCADE/NO ACTION/RESTRICT/غایب، ۳ CHECK constraint جدید (attempts≥0، max_attempts>0، attempts≤max). ۸) `scripts/process-notifications.mjs` — اسکریپت processor با timeout 50s؛ ⚠️ Liara Next.js cron blocker گزارش شد. ۹) `.env.example` — provider-neutral DB، `KAVENEGAR_API_KEY`، `SMS_DRY_RUN`، `APP_URL`. ۱۰) تست‌های جدید (۲۷): field-level SMTP، SMS boundary، store unread count، bell view، delta rollback، service active rule، API routes. نتیجه: 207→234 تست. ۱۱) مستندات: ROLLOUT.md (6-step release + Liara cron blocker)، NC-V2-CHANGES-ANALYSIS.md (دور سوم).
**فایل‌ها:** `store/slices/notificationsSlice.ts`، `app/(app)/notifications/page.tsx`، `app/api/admin/notifications/provider-status/route.ts`، `app/api/admin/notification-rules/route.ts`، `lib/notifications/channels/email.ts`، `lib/notifications/processor.ts`، `project-docs/migrations/db-notification-center-v2.sql`، `scripts/process-notifications.mjs` (جدید)، `.env.example`، `tests/unit/notification-center-v2.test.ts`، `project-docs/NOTIFICATION-CENTER-V2-ROLLOUT.md`، `project-docs/NC-V2-CHANGES-ANALYSIS.md`، `HANDOFF.md`، `project-docs/handoff-archive.md`
**Build:** tsc ✅ ۰ خطا · tests 234/234 ✅ · build ✅ · git diff --check ✅
**ناتمام:** push نشده — منتظر تأیید کاربر برای commit+push
**برای جلسه‌ی بعد:** ۱) ROLLOUT.md بخوان — ۶ قدم release. ۲) env vars در Liara. ۳) migration اجرا. ۴) push. ۵) ⚠️ Liara Cron Job service بساز.

## 📓 2026-07-16 — تست‌های رفتاری NC V2 — ۳۷ تست جدید، کد تولید مستقیم (v0.28.0)
**چه شد:** ۳۷ تست رفتاری به `tests/unit/notification-center-v2.test.ts` افزوده شد. همه تست‌ها کد تولیدی واقعی را import و اجرا می‌کنند (بدون re-implementation). پوشش: ۱) `cursor.ts` — UUID validation، size limit >512 bytes. ۲) `rules.ts` — shouldEnqueueEmail فقط از DB rule تبعیت می‌کند نه SMTP. ۳) `processor.ts` — buildSmsMessage، link ایمن/ناایمن، truncation صحیح. ۴) `channels/email.ts` — SMTP absent → status='failed' (retryable، نه 'skipped'). ۵) store — Bell fetch با `setViewPage` page cursor را پاک نمی‌کند؛ append به یک view روی view دیگر اثر نمی‌گذارد. ۶) store rollback — concurrent realtime event بعد از rollback یک item حذف نمی‌شود. ۷) process route (`app/api/internal/notifications/process/route.ts`) — secret missing → 503؛ اشتباه → 401؛ درست → 200؛ error پاک نمی‌کند. ۸) `service.ts` — disabled rule → هیچ insert اجرا نمی‌شود؛ outerTx → db.transaction صدا زده نمی‌شود. ۹) `retry.ts` — nextDayMidnightTehran همیشه > now؛ Tehran midnight 00:00 صحیح است. نتیجه: ۸۵→۱۲۲ تست در nc-v2، جمع کل ۱۷۰→۲۰۷. tsc ✅ build ✅.
**فایل‌ها:** `tests/unit/notification-center-v2.test.ts`، `HANDOFF.md`
**Build:** tsc ✅ ۰ خطا · tests 207/207 ✅ · build ✅ · push ⛔ (عمدی — دستور کاربر)
**ناتمام:** push نشده · migration `db-notification-center-v2.sql` روی DB اجرا نشده · Playwright e2e ⛔ (`.env.e2e` غایب)
**برای جلسه‌ی بعد:** ۱) `project-docs/NOTIFICATION-CENTER-V2-ROLLOUT.md` بخوان. ۲) migration را روی DB اجرا کن. ۳) `NOTIFICATION_PROCESSOR_SECRET` + `MAIL_*` vars در Liara ست کن. ۴) push کن.

## 📓 2026-07-16 — ممیزی مستقل ۹‌بخشی NC V2 — تمام ایرادها اصلاح شد (v0.28.0)
**چه شد:** ممیزی مستقل ۹ ایراد حیاتی پیدا کرد. همه در همین جلسه اصلاح شد (بدون commit/push — دستور صریح کاربر). خلاصه: ۱) **eventKey contract** — پارامتر اجباری `eventKey: string` به `EnqueueOutboxParams` افزوده شد؛ محاسبه یک‌بار در `notifyWithClient` انجام می‌شود (`idempotencyKey ?? entityId ?? randomUUID()`). ۲) **TX passthrough** — `notifyWithClient(params, options, client)` معرفی شد؛ همه reads (resolveRule، query ادمین‌ها) و writes (notification + outbox) از یک client تراکنش‌محور استفاده می‌کنند. ۳) **Channel contract** — default هر channel `true` است؛ قانون DB تنها arbiter ارسال واقعی است؛ `lib/recruitment/notify.ts` حالا `{ sms: true, email: true }` اعلام می‌کند. ۴) **امنیت URL** — `isSafeActionUrl` حالا `//evil`، `///path`، `ftp:`، `javascript:`، `data:` را رد می‌کند؛ فقط relative (بدون `//`) یا absolute با `http/https` + origin match مجاز است. ۵) **Outbox queue** — compound cursor `(updatedAt, id)` DEsc با base64 JSON؛ retry-one فقط برای `dead/failed`؛ 422 برای `sent/processing`؛ summary stats (pending, processing, dead, sentToday, oldestPendingAgeSeconds, smsConfigured, emailConfigured)؛ UI per-row retry + load-more واقعی. ۶) **Realtime/store** — store single source of truth؛ `upsertNotification` برای INSERT/UPDATE realtime؛ `markNotificationUnread`، `archiveNotification` با optimistic rollback؛ Bell و page هر دو از store می‌خوانند. ۷) **تست‌ها** — 170/170 سبز؛ cursor codec از `lib/notifications/cursor.ts` import می‌شود (بدون re-implementation)؛ 85 تست جدید در `notification-center-v2.test.ts`. ۸) **حریم خصوصی** — `recipientId` از `OutboxPayload` حذف شد؛ کامنت‌های نادرست اصلاح شد. ۹) **Migration idempotency** — CHECK constraints از `CREATE TABLE IF NOT EXISTS` خارج و در بلاک‌های `DO $ BEGIN IF NOT EXISTS` قرار گرفتند.
**فایل‌ها:** `lib/notifications/outbox.ts`، `lib/notifications/service.ts`، `lib/notifications/types.ts`، `lib/notifications/templates.ts`، `lib/notifications/cursor.ts` (جدید)، `lib/notify.ts`، `lib/recruitment/notify.ts`، `lib/repos/types.ts`، `lib/repos/api.ts`، `store/slices/notificationsSlice.ts`، `app/api/admin/notification-outbox/route.ts`، `app/(app)/notifications/page.tsx`، `components/layout/NotificationsBell.tsx`، `lib/realtime/useRealtime.ts`، `project-docs/migrations/db-notification-center-v2.sql`، `tests/unit/notification-center-v2.test.ts`، `tests/unit/recruitment-notification.test.ts`، `project-docs/NC-V2-CHANGES-ANALYSIS.md`، `project-docs/NOTIFICATION-CENTER-V2-ROLLOUT.md`
**Build:** tsc ✅ ۰ خطا · tests 170/170 ✅ · build ✅ · playwright --list ✅ 22 تست · git diff --check ✅ · push ⛔ (عمدی)
**ناتمام:** push نشده · migration `db-notification-center-v2.sql` روی DB اجرا نشده · env vars در Liara ست نشده
**برای جلسه‌ی بعد:** ۱) `project-docs/NOTIFICATION-CENTER-V2-ROLLOUT.md` بخوان. ۲) migration را روی DB اجرا کن. ۳) `NOTIFICATION_PROCESSOR_SECRET` + `MAIL_*` vars در Liara ست کن. ۴) push کن (deploy خودکار).

## 📓 2026-07-16 — اصلاح ۱۵‌گانه Notification Center V2 — production-ready (v0.28.0)
**چه شد:** تمام ۱۵ بخش اصلاح جامع روی branch `feat/notification-center-v2` اعمال شد (بدون commit/push — دستور صریح کاربر). بخش‌ها: ۱) payload شامل title/sub/actionUrl (processor دیگر به notification_id لوک‌آپ نمی‌کند). ۲) eventKey null-safe: `entityId ?? idempotencyKey ?? randomUUID()` — هر call null-entity، key یکتا می‌گیرد. ۳) TX passthrough از `notifyAdmins` تا `runBatch`. ۴) فیلتر `isActive=true` روی query ادمین‌ها؛ `recipient_id` nullable + SET NULL (حذف کاربر audit را خراب نمی‌کند). ۵) Compound keyset cursor (base64 JSON `{at,id}`) + DB COUNT برای unread + invalid cursor → 400. ۶) atomic UPDATE...RETURNING؛ `isSafeActionUrl` مقایسه origin (نه prefix)؛ `constantTimeEqual` به `lib/notifications/secret.ts` منتقل شد؛ لو دادن error detail حذف شد. ۷) `capExceeded: boolean` در `DeliveryResult`؛ retry cap به Tehran midnight (`nextDayMidnightTehran`). ۸) migration: backfill حذف، seed به DO NOTHING تبدیل، CHECK constraints نام‌گذاری شد. ۹) SMTP guard در rules PATCH؛ endpoint status provider؛ SmsPane duplicate حذف + Link جایگزین. ۱۰) pagination outbox + masked recipient + per-row retry. ۱۱) useRealtime V2 fields. ۱۲) types به‌روز. ۱۳) تست‌ها ۵۴→۶۳ (148/148 ✅). ۱۴) ROLLOUT.md ایجاد. ۱۵) gate: tsc ✅، build ✅.
**فایل‌ها:** `lib/notifications/secret.ts` (جدید)، `lib/notifications/outbox.ts`، `lib/notifications/service.ts`، `lib/notifications/retry.ts`، `lib/notifications/processor.ts`، `lib/notifications/templates.ts`، `lib/notifications/channels/sms.ts`، `lib/notifications/types.ts`، `lib/notify.ts`، `lib/db/schema.ts`، `app/api/notifications/route.ts`، `app/api/internal/notifications/process/route.ts`، `app/api/admin/notification-outbox/route.ts`، `app/api/admin/notification-rules/route.ts`، `app/api/admin/notifications/provider-status/route.ts` (جدید)، `components/settings/SmsPane.tsx`، `lib/realtime/useRealtime.ts`، `types/notification.ts`، `tests/unit/notification-center-v2.test.ts`، `project-docs/migrations/db-notification-center-v2.sql`، `project-docs/NOTIFICATION-CENTER-V2-ROLLOUT.md` (جدید)
**Build:** tsc ✅ ۰ خطا · tests 148/148 ✅ · build ✅ · git diff --check ✅ · push ⛔ (عمدی)
**ناتمام:** push نشده · migration `db-notification-center-v2.sql` روی DB اجرا نشده · env vars در Liara ست نشده
**برای جلسه‌ی بعد:** ۱) `project-docs/NOTIFICATION-CENTER-V2-ROLLOUT.md` بخوان. ۲) migration را روی DB اجرا کن. ۳) `NOTIFICATION_PROCESSOR_SECRET` + `MAIL_*` vars در Liara ست کن. ۴) push کن (deploy خودکار).

## 📓 2026-07-16 — Notification Center V2 (v0.28.0) — branch feat/notification-center-v2
**چه شد:** پیاده‌سازی کامل Notification Center V2 روی branch محلی (هرگز push نشده): ۱) **فاز ۳** — `app/api/notifications/route.ts` بازنویسی کامل: ownership guard (user_id=session.sub روی همه queries)، keyset pagination (cursor-based)، Zod validation، فیلتر all/unread/archived/type، action read/unread/archive/read-all، 404 بدون لو دادن وجود row دیگران. ۲) **فاز ۵** — `app/api/internal/notifications/process/route.ts`: POST-only, constant-time secret comparison (timingSafeEqual), delegate به processOutboxBatch(). ۳) **فاز ۶** — SMTP + processor secret در `.env.example`. ۴) **فاز ۷** — `NotificationsBell.tsx` بازنویسی: fetch از API هنگام باز شدن، optimistic read/unread/archive با rollback، mark-all-read، فیلتر all/unread، grouping (امروز/دیروز/قدیمی‌تر)، relative time از createdAt، accessibility کامل (aria-*, focus management، reduced-motion). ۵) **فاز ۸** — `app/(app)/notifications/page.tsx`: inbox کامل با pagination، همه actions، loading/error states. ۶) **فاز ۹** — `useRealtime.ts`: اضافه شد UPDATE handler برای notifications (sync read state + حذف archived از store). ۷) **فاز ۱۰** — admin page با tabs (قوانین + صف ارسال)، channel controls (in-app/email toggle)، outbox monitoring، retry-dead. ۸) **فاز ۱۲** — `tests/unit/notification-center-v2.test.ts`: ۵۴ تست covering retry schedule، redaction، templates، outbox dedupe keys، processor secret. ۹) **فاز ۱۳** — نسخه ۰.۲۸.۰.
**فایل‌ها:** `app/api/notifications/route.ts`، `app/api/internal/notifications/process/route.ts`، `app/api/admin/notification-outbox/route.ts`، `app/api/admin/notification-rules/route.ts`، `app/(app)/notifications/page.tsx`، `app/(admin)/admin/settings/notifications/page.tsx`، `components/layout/NotificationsBell.tsx`، `lib/notifications/channels/email.ts`، `lib/notifications/redaction.ts`، `lib/realtime/useRealtime.ts`، `tests/unit/notification-center-v2.test.ts`، `.env.example`، `package.json`، `package-lock.json`
**Build:** tsc ✅ ۰ خطا · tests 139/139 ✅ · build پندینگ (اجرا نشده) · push ⛔ (عمدی — دستور صریح)
**ناتمام:** migration `db-notification-center-v2.sql` اجرا نشده · push نشده · build تأیید نشده
**برای جلسه‌ی بعد:** ۱) `npm run build` بزن. ۲) `project-docs/NOTIFICATION-CENTER-V2-ROLLOUT.md` بخوان. ۳) migration را روی DB اجرا کن. ۴) SMTP + processor vars را در Liara ست کن. ۵) push را تأیید کن.

## 📓 2026-07-15 — notification فاز ۱: اعلان in-app هنگام ثبت استخدام (v0.27.0)
**چه شد:** ۱) `lib/recruitment/notify.ts`: `buildRecruitmentSub()` خالص (فقط نام + برچسب فارسی بخش؛ بدون شماره، رزومه، پاسخ‌ها، یا سایر فیلدهای حساس) + `fireRecruitmentNotification()` (fire-and-forget؛ خطا → logEvent، هرگز به caller نمی‌رسد). ۲) `app/api/recruitment/route.ts`: `returning()` از یک ستون به چهار ستون (`id, firstName, lastName, area`) گسترش یافت؛ `fireRecruitmentNotification(row)` قبل از `return 201` فراخوانی می‌شود. ۳) `tests/unit/recruitment-notification.test.ts` (۶ تست): helper tests — `notifyAdmins` یک بار با entityId صدا می‌خورد، rejection propagate نمی‌شود، شماره، رزومه، یا فیلدهای حساس در sub نیستند. ۴) `tests/unit/recruitment-route.test.ts` (۴ تست): partial mock — real `fireRecruitmentNotification` با spy؛ mock فقط `notifyAdmins` و `logEvent`؛ وقتی `notifyAdmins` reject کند `logEvent` با `level:'warn'` صدا می‌خورد و route هنوز 201 برمی‌گرداند؛ `spyFire.mock.calls[0][0]` دقیقاً `DB_ROW` است (بدون شماره، رزومه، پاسخ‌ها، یا سایر فیلدهای حساس). ۵) `project-docs/migrations/db-recruitment-notification-rule.sql`: INSERT ایمن با `ON CONFLICT DO NOTHING`. ۶) نسخه → `0.27.0`. **⚠️ migration اجرا نشده. push نشده — دستور صریح کاربر.**
**فایل‌ها:** `lib/recruitment/notify.ts`، `app/api/recruitment/route.ts`، `tests/unit/recruitment-notification.test.ts`، `tests/unit/recruitment-route.test.ts`، `project-docs/migrations/db-recruitment-notification-rule.sql`، `package.json`، `package-lock.json`، `project-docs/handoff-archive.md`
**Build:** tsc ✅ ۰ خطا · tests 85/85 ✅ · build ✅ · commit محلی ✅ · push ⛔ (عمدی)
**ناتمام:** migration روی DB اجرا نشده — بدون آن toggle `notification_rules` وجود ندارد (فیچر کار می‌کند اما غیرقابل کنترل از Settings). push انجام نشده.
**برای جلسه‌ی بعد:** ۱) migration اجرا کن (DBeaver → SQL file → run). ۲) `git push` (deploy خودکار). ۳) فرم تست بزن و اعلان را در پنل بررسی کن. ۴) `.env.e2e` بساز → E2E tests. ۵) دسته‌های راه‌اندازی در Settings.

## 📓 2026-07-15 — جداسازی کامل E2E: route predicate + env wiring + نظافت artifacts (v0.26.0)
**چه شد:** ۱) `reports.spec.ts`: predicateهای regex overlapping جایگزین `url.pathname` exact match شدند. ۲) `fixtures/seed.ts` + `global-teardown.ts`: بارگذاری `.env.local` حذف؛ فقط `.env.e2e`؛ `E2E_DATABASE_URL`؛ guard `E2E_ALLOW_DB_MUTATION=1` با fail-fast پیش از اتصال DB. ۳) `.env.e2e.example` ایجاد شد. ۴) `.gitignore`: `.env.e2e` و `test-results/` اضافه شدند. ۵) `test-results/.last-run.json` از git index حذف شد. ۶) `playwright.config.ts`: `dotenv.config({override:false})` روی `.env.e2e` — CI variables اولویت دارند، غیاب فایل بی‌صدا نادیده گرفته می‌شود؛ `webServer.env` شامل `DATABASE_URL=E2E_DATABASE_URL` فقط وقتی مقدار موجود باشد (scoped به child process، هیچ تأثیری روی production/CI ندارد). Playwright ⛔ BLOCKED — اجرای واقعی نیاز به `.env.e2e` با `E2E_DATABASE_URL` معتبر دارد.
**فایل‌ها:** `playwright.config.ts`، `tests/e2e/reports.spec.ts`، `tests/e2e/fixtures/seed.ts`، `tests/e2e/global-teardown.ts`، `.env.e2e.example`، `.gitignore`، `project-docs/handoff-archive.md`
**Build:** tsc ✅ ۰ خطا · tests 75/75 ✅ · build ✅ · Playwright --list 7/7 ✅ · اجرای کامل ⛔ BLOCKED
**ناتمام:** —
**برای جلسه‌ی بعد:** `.env.e2e.example` را به `.env.e2e` کپی کن → `E2E_DATABASE_URL` را پر کن → `npm run test:e2e -- tests/e2e/reports.spec.ts`. سپس دسته‌های راه‌اندازی در Settings.

<!-- archived to project-docs/handoff-archive.md: 2026-07-14 payroll approve + تأیید نهایی فاز ۱ v0.24.0 + 2026-07-14 فاز امنیتی ۱ + 2026-07-15 استقرار جریان تک‌نشست + 2026-07-15 تست رگرسیون P&L -->

