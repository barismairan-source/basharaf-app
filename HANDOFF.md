# HANDOFF.md — دفتر وضعیت زنده‌ی پروژه «با شرف»

> این فایل **دفتر رله‌ی بین دو اکانت Claude Code** است که نوبتی روی همین پوشه کار می‌کنند.
> قانون طلایی: **هر جلسه اول بخش ۰ را بخوان؛ آخر جلسه بخش ۰ + ژورنال را به‌روز کن و commit/push کن.**
> جزئیات تاریخی قدیمی‌تر: `project-docs/handoff-archive.md` (اگر نبود، اولین جلسه بسازد).

---

## ⚡ بخش ۰ — وضعیت لحظه‌ای (اول این را بخوان)

| | |
|---|---|
| **نسخه** | `0.9.69-detective-phase5` |
| **آخرین به‌روزرسانی** | 2026-07-07 — اکانت: ۱ |
| **Build/tsc** | tsc سبز ✅ (۰ خطا) · build ✅ · 48 unit tests سبز |
| **دیپلوی** | ✅ **GitHub Actions فعال**. 🟡 **۵ migration pending**: `db-waste-reason-migration.sql`، `db-cheques-migration.sql`، `db-sms-anomaly-migration.sql`، `db-sms-phase3-migration.sql`، `db-anomaly-migration.sql` — باید در pgAdmin اجرا شوند. |
| **کار نیمه‌تمام (in-progress)** | — |
| **کار بعدی پیشنهادی** | فاز ۵ کامل شد ✅. بعدی: اجرای migrationها در pgAdmin + تنظیم env vars. بعد از آن: مشخص توسط کاربر. |
| **بلاک‌شده/منتظر کاربر** | ۱. اجرای ۵ migration در pgAdmin (ترتیب: waste-reason → cheques → sms-anomaly → sms-phase3 → anomaly). ۲. تنظیم `KAVENEGAR_API_KEY` + `DETECTIVE_SCAN_SECRET` در GitHub Secrets. |

> ⛔ **هشدار همزمانی:** هر دو اکانت روی **یک پوشه‌ی واحد** کار می‌کنند. **هرگز دو جلسه هم‌زمان باز نکنید** — تغییرات همدیگر را خراب می‌کنند. همیشه نوبتی: جلسه‌ی قبلی commit/push کرده باشد، بعد جلسه‌ی جدید شروع شود.

---

## 🔁 پروتکل رله‌ی دو اکانت

### شروع هر جلسه (الزامی — به ترتیب)
1. این فایل، بخش ۰ + جدیدترین ورودی ژورنال را بخوان.
2. `git status` بزن — اگر تغییرات commit‌نشده هست، یعنی جلسه‌ی قبل ناقص بسته شده: اول وضعیت را با کاربر روشن کن، چیزی را کورکورانه commit یا revert نکن.
3. `git log -5 --oneline` — تطبیق بده با ژورنال.
4. به کاربر خلاصه بگو: «وضعیت X است، کار نیمه‌تمام Y، پیشنهاد بعدی Z» و منتظر تأیید بمان.

### پایان هر جلسه / بعد از هر تغییر معنادار (الزامی)
1. یک ورودی ژورنال با **قالب زیر** به بالای بخش ژورنال اضافه کن.
2. بخش ۰ را به‌روز کن (نسخه، تاریخ، اکانت، کار نیمه‌تمام، کار بعدی).
3. اگر ژورنال بیش از **۷ ورودی** شد، قدیمی‌ها را به `project-docs/handoff-archive.md` منتقل کن.
4. `git add -A && git commit -m "..." && git push` — **بدون push جلسه را نبند.**
5. ⛔ **دیگر ZIP نساز** — GitHub Actions خودکار deploy می‌کند (از 2026-06-24).

### قالب اجباری ورودی ژورنال
```markdown
## 📓 [تاریخ] — [عنوان کوتاه] — اکانت [۱/۲]
**چه شد:** (۲–۵ خط، تصمیم‌های مهم + چرایی)
**فایل‌ها:** (مسیر کامل ایجاد/ویرایش‌شده‌ها)
**Build:** tsc/build سبز یا خطا + متن خطا
**ناتمام:** دقیقاً کجا متوقف شد، چه چیزی نیمه‌کاره است (اگر هیچ: «—»)
**برای جلسه‌ی بعد:** کار بعدی مشخص + هر هشداری که اکانت دیگر باید بداند
```

---

## 📓 ژورنال نشست‌ها (جدیدترین بالا — حداکثر ۷ ورودی)

## 📓 2026-07-07 — فاز ۵: UI کارآگاه مالی + تنظیمات + Badge — اکانت ۱
**چه شد:** فاز پایانی پروژه کارآگاه کامل پیاده شد:
- **`app/(app)/anomaly/page.tsx`**: کارت‌های خلاصه (high/medium/low/total open)، جدول با فیلتر شدت/وضعیت/شعبه/قانون، Sheet drawer با خلاصه فارسی + metadata + لینک مستقیم به رکورد منبع (voucher/transaction) + تغییر وضعیت (new→investigating→confirmed|false_positive) + یادداشت + audit log خودکار.
- **Sidebar badge**: badge قرمز تعداد یافته‌های باز high در کنار «کارآگاه مالی» — refresh روی هر route change (SuperAdmin only). Collapsed: badge کوچک روی آیکون. Expanded: badge کنار label.
- **Settings → «قوانین کارآگاه»**: تب جدید فقط SuperAdmin — toggle enabled/disabled هر قانون، toggle smsEnabled، expand برای ویرایش JSON thresholds بدون deploy.
- **API**: `GET/PATCH anomaly/findings`، `GET anomaly/findings/counts`، `PATCH anomaly/findings/[id]`، `GET anomaly/rules`، `PATCH anomaly/rules/[key]`.
- **permissions**: `'anomaly'` SectionKey + sectionForPath → nav middleware کار می‌کند.
**فایل‌ها:** `app/(app)/anomaly/page.tsx` (جدید), `app/api/anomaly/findings/route.ts`, `app/api/anomaly/findings/counts/route.ts`, `app/api/anomaly/findings/[id]/route.ts`, `app/api/anomaly/rules/route.ts`, `app/api/anomaly/rules/[key]/route.ts`, `components/layout/Sidebar.tsx`, `components/layout/nav-config.ts`, `components/settings/SettingsNav.tsx`, `components/settings/DetectivePane.tsx` (جدید), `components/settings/index.ts`, `app/(app)/settings/page.tsx`, `lib/auth/audit.ts`, `lib/auth/permissions.ts`
**Build:** tsc ✅ ۰ خطا · build ✅ · 48 unit tests ✅. Commit: 5dffacd
**ناتمام:** —
**برای جلسه‌ی بعد:** همه چیز commit/push شد. ۵ migration در pgAdmin باید اجرا شود. `KAVENEGAR_API_KEY` + `DETECTIVE_SCAN_SECRET` در GitHub Secrets. بعد از آن می‌توان SMS live را تست کرد.

## 📓 2026-07-06 — فاز ۴: موتور کارآگاه مالی — اکانت ۱
**چه شد:** موتور کارآگاه کامل پیاده شد. هیچ مسیر مالی شکسته یا کند نشد — تمام callها fire-and-forget با try/catch هستند.
- **`db-anomaly-migration.sql`**: جدول `anomaly_findings` (text+CHECK برای severity/status) + `anomaly_rules` (JSON thresholds) + seed ۶ قانون + seed در notification_rules برای UI آینده.
- **`lib/anomaly/`**: `types.ts`، `utils.ts` (توابع خالص قابل unit test)، `engine.ts` (isDuplicate با بازه ۲۴h، saveFindings، notifyAdmins برای high/medium).
- **۶ قانون**: wasteSpikeRule (waste voucher approve، high)، priceJumpRule (in voucher approve، high)، rejectionPatternRule (tx+voucher reject، medium)، consumptionSpikeRule (daily scan، medium)، belowApprovalLimitRule (tx create، high)، offHoursRule (tx create، low).
- **`POST /api/anomaly/scan`**: SuperAdmin یا `X-Scan-Secret` header.
- **Wire**: voucher approve (waste+in)، voucher reject، tx reject، tx create — همه fire-and-forget.
- **16 unit test**: توابع خالص ۲ قانون + dedup mock.
**فایل‌ها:** `db-anomaly-migration.sql`, `lib/anomaly/types.ts`, `lib/anomaly/utils.ts`, `lib/anomaly/engine.ts`, `lib/anomaly/rules/wasteSpikeRule.ts`, `lib/anomaly/rules/priceJumpRule.ts`, `lib/anomaly/rules/rejectionPatternRule.ts`, `lib/anomaly/rules/consumptionSpikeRule.ts`, `lib/anomaly/rules/belowApprovalLimitRule.ts`, `lib/anomaly/rules/offHoursRule.ts`, `app/api/anomaly/scan/route.ts`, `app/api/transactions/route.ts`, `app/api/transactions/[id]/reject/route.ts`, `app/api/inventory/vouchers/[id]/approve/route.ts`, `app/api/inventory/vouchers/[id]/reject/route.ts`, `lib/db/schema.ts`, `tests/unit/anomaly.test.ts`
**Build:** tsc ✅ · build ✅ · 48 unit tests ✅. Commit: 8a39294
**ناتمام:** —
**برای جلسه‌ی بعد:** ۵ migration در pgAdmin (db-anomaly-migration.sql جدید). **فاز ۵**: صفحه `/detective` (لیست findings، فیلتر status/severity، تغییر وضعیت)، کارت داشبورد، nav item، اتصال SMS برای high/medium alerts، `DETECTIVE_SCAN_SECRET` در GitHub Actions.

## 📓 2026-07-06 — فاز ۳: SMS کانال notification — اکانت ۱
**چه شد:** پیامک به‌عنوان کانال موازی سیستم notifications v2 وصل شد. هیچ رفتار موجودی نشکست.
- **Wire `{ sms: true }`** در همه‌ی `notifyAdmins()` callها: `transactions/approve` (low_stock + high_value_tx جدید)، `purchase-orders/receive` (po_received)، `inventory/vouchers/import` (voucher_pending). `cheque.dueSoon` از `notify(null)` به `notifyAdmins()` تبدیل شد.
- **`high_value_tx`** اولین پیاده‌سازی — بعد از approve تراکنش، threshold از notification_rules می‌خواند؛ اگر amount≥threshold → notifyAdmins + sms.
- **API جدید**: `GET /api/sms/log`، `GET/PATCH /api/admin/sms-settings`، `POST /api/sms/test-notify`.
- **SmsPane کامل**: ۴ بخش — تنظیمات cap/dedup، مدیریت شماره SuperAdminها، toggleهای per-rule، جدول sms_log + دکمه تست کامل.
- **`db-sms-phase3-migration.sql`**: seed قانون `sms.test_notify`.
**فایل‌ها:** `db-sms-phase3-migration.sql`, `app/api/sms/log/route.ts`, `app/api/sms/test-notify/route.ts`, `app/api/admin/sms-settings/route.ts`, `app/api/transactions/[id]/approve/route.ts`, `app/api/cheques/route.ts`, `app/api/purchase-orders/[id]/receive/route.ts`, `app/api/inventory/vouchers/import/route.ts`, `app/api/users/route.ts`, `components/settings/SmsPane.tsx`
**Build:** tsc ✅ · build ✅. Commit: 69500c7
**ناتمام:** —
**برای جلسه‌ی بعد:** ۴ migration در pgAdmin. **فاز ۴** موتور کارآگاه: `lib/detective/`، `anomaly_findings` table، ۶ قانون. یادآوری: `DETECTIVE_SCAN_SECRET` در GitHub Actions.

## 📓 2026-07-06 — فاز ۲: هسته‌ی پیامک (SMS core) — اکانت ۱
**چه شد:** کاربر طراحی INVESTIGATION را تأیید کرد + ۵ سوال باز را پاسخ داد. فاز ۲ کامل پیاده شد:
- **`db-sms-anomaly-migration.sql`**: جدول `sms_log` (dedup/cap/dry_run)، `sms_phone` روی `users`، `sms_enabled` روی `notification_rules`، seed تنظیمات در `app_settings`. همه قوانین با `sms_enabled=false` شروع می‌شوند (اصل پیش‌فرض خاموش).
- **`lib/sms/`**: `types.ts` (SmsStatus/SendSmsParams/SendSmsResult)، `kavenegar.ts` (dry-run وقتی KEY نباشد یا SMS_DRY_RUN=true)، `sendSms.ts` (cap از app_settings، dedup N ساعته، fire-and-forget).
- **`lib/notify.ts`**: `notifyAdmins` با `options?: { sms? }` — اگر قانون `sms_enabled=true` باشد و ادمین `sms_phone` داشته باشد، `sendSms` به‌صورت fire-and-forget صدا می‌شود.
- **`GET/PATCH /api/admin/notification-rules`**: `smsEnabled` اضافه شد.
- **`PATCH /api/users/[id]`**: `smsPhone` با regex validation. `GET /api/users/[id]` (جدید).
- **`POST /api/sms/test`**: endpoint آزمایشی (SuperAdmin).
- **Settings > تب «پیامک»**: `SmsPane` با فرم شماره + دکمه آزمایشی + toggle per-rule.
**فایل‌ها:** `db-sms-anomaly-migration.sql` (جدید), `lib/sms/types.ts` (جدید), `lib/sms/kavenegar.ts` (جدید), `lib/sms/sendSms.ts` (جدید), `lib/notify.ts`, `lib/db/schema.ts`, `app/api/sms/test/route.ts` (جدید), `app/api/admin/notification-rules/route.ts`, `app/api/users/[id]/route.ts`, `components/settings/SmsPane.tsx` (جدید), `components/settings/SettingsNav.tsx`, `components/settings/index.ts`, `app/(app)/settings/page.tsx`
**Build:** tsc ✅ ۰ خطا · build ✅. Commit: a73b9c1
**ناتمام:** —
**برای جلسه‌ی بعد:** ۳ migration در pgAdmin اجرا شوند. فاز ۳: اتصال SMS به notifyAdmins در routeهایی که مهم‌اند (مثلاً approve تراکنش بزرگ). فاز ۴: موتور کارآگاه. یادآوری: DETECTIVE_SCAN_SECRET را در GitHub Actions بساز (وقتی فاز ۴ شروع شد).

## 📓 2026-07-06 — طراحی کارآگاه مالی + زیرساخت پیامک — اکانت ۱
**چه شد:** فاز تحلیل و طراحی کامل شد (بدون هیچ کد/migration). سند کامل در `project-docs/INVESTIGATION-anomaly-sms.md`.
- **SMS:** Kavenegar انتخاب شد. جدول `sms_log`. ستون `sms_enabled` به `notification_rules`. ستون `sms_phone` به `users`. منطق سقف روزانه + dedup. Fallback به اعلان داخلی. SMS «کانال» همان notification_rules است نه سیستم جداگانه.
- **کارآگاه:** ۶ قانون rule-based: waste_spike, price_jump, rejection_pattern, consumption_spike, below_approval_limit, off_hours. جدول `anomaly_findings` با چرخه‌ی وضعیت new→investigating→confirmed/false_positive. زمان‌بندی ترکیبی: ۵ قانون event-driven + ۱ قانون daily scan از GitHub Actions.
- **فازبندی:** ۴ فاز مشخص (۲=SMS هسته، ۳=اتصال به notify، ۴=موتور detective، ۵=UI).
- ۵ سوال باز در بخش ۷ سند — منتظر پاسخ کاربر.
**فایل‌ها:** `project-docs/INVESTIGATION-anomaly-sms.md` (جدید)
**Build:** هیچ کدی تغییر نکرد — فقط سند طراحی.
**ناتمام:** —
**برای جلسه‌ی بعد:** کاربر ۵ سوال بخش ۷ را پاسخ دهد، فاز ۲ شروع شود.

## 📓 2026-07-06 — Flash Report روزانه برای داشبورد — اکانت ۱
**چه شد:** گزارش روزانه «یک‌نگاهی» برای مالک پیاده شد:
- **`lib/reports/flashReport.ts`**: تابع `getFlashReport(dateJalali, branchId?)` — منطق جداگانه برای استفاده مجدد (بات تلگرام آینده). جمع income امروز، COGS (بهای تمام‌شده COGS)، payroll، ضایعات (invVouchers kind='waste') + همان داده‌های هفته‌ی پیش برای مقایسه ٪.
- **`GET /api/reports/flash?date=jalali&branchId=`**: endpoint ساده — زمینه session + date امروز به‌صورت پیش‌فرض.
- **`FlashReportCard`** در داشبورد (فقط SuperAdmin): ۵ KPI در یک ردیف — فروش (+ فلش هفته قبل)، تعداد فاکتور، COGS (+ فلش)، Prime Cost % (رنگ‌بندی ≤۶۰٪ سبز/۶۰–۶۵٪ کهربایی/>۶۵٪ قرمز)، ضایعات.
**فایل‌ها:** `lib/reports/flashReport.ts` (جدید), `app/api/reports/flash/route.ts` (جدید), `components/dashboard/FlashReportCard.tsx` (جدید), `components/dashboard/index.ts`, `app/(app)/dashboard/page.tsx`
**Build:** tsc ✅ ۰ خطا · build ✅. Commit: 8d8f288
**ناتمام:** —
**برای جلسه‌ی بعد:** اگر بات تلگرام اضافه شد، `getFlashReport` را مستقیم صدا بزند. موارد 🟠: parseFloat مالی انبار، force-reset حقوق، rate limit OTP.

## 📓 2026-07-06 — ماژول مدیریت چک + ضایعات با دلیل — اکانت ۱
**چه شد:**
(۱) **ضایعات با دلیل** (کامل شد): `wasteReason text nullable` به `inv_voucher_lines` اضافه شد. UI فرم دریافت انبار: select با گزینه‌های فارسی + ورودی متن سفاری برای «سایر». Migration: `db-waste-reason-migration.sql`.
(۲) **ماژول چک‌ها** (کامل):
  - Schema: جدول `cheques` (text+CHECK برای kind/status، bigint تومان، تاریخ جلالی text). Migration: `db-cheques-migration.sql`.
  - API: `GET/POST /api/cheques`، `GET/PATCH/DELETE /api/cheques/[id]`، `GET /api/contacts/[id]/cheques`.
  - صفحه `/cheques`: دو تب (دریافتی/پرداختی)، کارت‌های خلاصه، جدول با رنگ‌بندی (قرمز = سررسید گذشته، کهربایی = ≤۷ روز)، select inline برای تغییر وضعیت، Sheet فرم با JalaliDatePicker، دکمه «ثبت تراکنش» → prefill `/transactions/new` از طریق URL params.
  - sidebar: آیتم «چک‌ها» با آیکون FileCheck بین صندوق‌ها و طرف‌حساب‌ها.
  - `ContactLedgerDrawer`: بخش «چک‌ها» اضافه شد (parallel fetch از `/api/contacts/[id]/cheques`).
  - `transactions/new`: prefill از URL params با `useSearchParams`.
  - `audit.ts`: نوع `chq.statusChanged` اضافه شد.
  - notification rule `cheque.dueSoon` در migration SQL.
**فایل‌ها:** `app/(app)/cheques/page.tsx` (جدید), `app/api/cheques/route.ts` (جدید), `app/api/cheques/[id]/route.ts` (جدید), `app/api/contacts/[id]/cheques/route.ts` (جدید), `types/cheque.ts` (جدید), `types/index.ts`, `lib/db/schema.ts`, `lib/auth/audit.ts`, `components/layout/nav-config.ts`, `components/contacts/ContactLedgerDrawer.tsx`, `app/(app)/transactions/new/page.tsx`, `db-waste-reason-migration.sql` (جدید), `db-cheques-migration.sql` (جدید)
**Build:** tsc ✅ ۰ خطا · build ✅. Commits: ce170cf (waste reason), 5944e32 (cheques)
**ناتمام:** —
**برای جلسه‌ی بعد:** ۲ migration باید در pgAdmin اجرا شوند. موارد 🟠: parseFloat مالی انبار، force-reset حقوق، rate limit OTP.

