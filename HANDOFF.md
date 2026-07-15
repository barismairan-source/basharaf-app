# HANDOFF.md — دفتر وضعیت زنده‌ی پروژه «با شرف»

> قانون طلایی: **هر جلسه اول بخش ۰ را بخوان؛ آخر جلسه بخش ۰ + ژورنال را به‌روز کن و commit/push کن.**
> جزئیات تاریخی قدیمی‌تر: `project-docs/handoff-archive.md`.

---

## ⚡ بخش ۰ — وضعیت لحظه‌ای (اول این را بخوان)

| | |
|---|---|
| **نسخه** | `0.27.0` |
| **آخرین به‌روزرسانی** | 2026-07-15 |
| **Build/tsc** | tsc سبز ✅ (۰ خطا) · tests 85/85 ✅ · build ✅ |
| **دیپلوی** | ⚠️ commit محلی — push عمداً انجام نشده (دستور صریح کاربر). migration اجرا نشده. |
| **کار نیمه‌تمام (in-progress)** | — |
| **کار بعدی پیشنهادی** | ۱) migration را اجرا کن: `project-docs/migrations/db-recruitment-notification-rule.sql` روی DB (DBeaver). ۲) `git push` بزن تا فیچر deploy شود. ۳) یک فرم استخدام تست بزن و بررسی کن اعلان در پنل ظاهر می‌شود. ۴) `.env.e2e` بساز → E2E tests. |
| **بلاک‌شده/منتظر کاربر** | push عمداً نشده — منتظر تأیید کاربر · migration اجرا نشده — منتظر تأیید · Playwright e2e ⛔ — `.env.e2e` غایب |

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

## 📓 2026-07-15 — تست رگرسیون P&L drilldown + رفع شکاف‌های مستندات (v0.26.0)
**چه شد:** ۱) قانون «یک نشست» به `CLAUDE.md` و `HANDOFF.md` اضافه شد. ۲) وضعیت Build ورودی baseline در ژورنال اصلاح شد (از «در حال تأیید» به تأیید واقعی). ۳) قدیمی‌ترین ورودی ژورنال (فاز ۸) به `handoff-archive.md` منتقل شد. ۴) `tests/e2e/reports.spec.ts` نوشته شد — ۷ تست کاملاً mocked برای ۴ سگمنت P&L (revenue/cogs/payroll/other)، toggle باز/بسته، و لینک «مشاهده همه». ۵) تأیید مستقل از کد رفتار `toggleDrill` و `DrillSection`. Graphify: Community 2 «Financial Integrity» اتصال‌های Financial Approval State Machine ↔ Atomic Reversal ↔ WAC را نشان داد — همان nodes تحت پوشش tests/unit/security-guards.
**فایل‌ها:** `CLAUDE.md`، `HANDOFF.md`، `project-docs/handoff-archive.md`، `tests/e2e/reports.spec.ts`
**Build:** tsc ✅ ۰ خطا · tests 75/75 ✅ · build ✅ · Playwright ⛔ (بلاک — `.env.local` غایب)
**ناتمام:** Playwright نمی‌تواند اجرا شود — `DATABASE_URL` ناموجود → `global-setup/seed.ts` خطا می‌دهد. spec نوشته و type-check سبز است؛ برای اجرا `DATABASE_URL` را در `.env.local` ست کن.
**برای جلسه‌ی بعد:** `.env.local` بساز یا `DATABASE_URL` ست کن → `npm run test:e2e -- tests/e2e/reports.spec.ts` را اجرا کن. سپس دسته‌های راه‌اندازی در Settings.

## 📓 2026-07-15 — استقرار جریان کاری تک‌نشست + نظافت مستندات (v0.26.0)
**چه شد:** حذف پروتکل دو-اکانت و یکسان‌سازی با جریان کاری تک Claude Code. فایل‌های حذف/بایگانی‌شده: `setup-two-accounts.sh` (ریشه)، `project-docs/SKILL.md` → `project-docs/archive/SKILL-v0.9.5-legacy.md`، `project-docs/handoff.md` → `project-docs/archive/handoff-v9-legacy.md`. Migration خالی بازگردانده شد (`git checkout`). `project-docs/README.md` (ایندکس مستندات) ایجاد شد. `NOTIF_RECON.md` حفظ شد. نسخه‌ی package.json به `0.26.0` همگام‌سازی شد.
**فایل‌ها:** `CLAUDE.md`، `HANDOFF.md`، `SKILL.md` (تازه)، `project-docs/handoff.md` (redirect)، `project-docs/README.md`، `project-docs/archive/` (جدید)، `project-docs/NOTIF_RECON.md`، `package.json`
**Build:** tsc ✅ ۰ خطا · tests 75/75 ✅ · build ✅
**ناتمام:** —
**برای جلسه‌ی بعد:** ۱) تست P&L drilldown در مرورگر. ۲) دسته‌های راه‌اندازی در Settings. ۳) تصمیم معماری اعلان (SMS/email).

## 📓 2026-07-14 — بستن کامل فاز امنیتی ۱: رفع bypass ورود دسته‌ای اقلام انبار (v0.26.0) — اکانت ۱
**چه شد:** آخرین bypass امنیتی رفع شد: `app/api/inventory/items/import/route.ts` از `requireSession()` به `requireAdmin()` تغییر کرد. قبلاً BranchUser و Chef می‌توانستند اقلام انبار + موجودی اولیه را با status=approved و applyBalance مستقیم وارد کنند. sweep کامل همه route‌ها هم انجام شد — هیچ موارد مشابه دیگری یافت نشد (produce و PO receive intentional هستند). **فاز امنیتی ۱ کاملاً بسته شد.**
**فایل‌ها:** `app/api/inventory/items/import/route.ts`
**Build:** tsc ✅ ۰ خطا · build ✅
**ناتمام:** —
**برای جلسه‌ی بعد:** تست P&L drilldown در مرورگر. دسته‌های راه‌اندازی در Settings.

## 📓 2026-07-14 — رفع race condition payroll approve (v0.25.0) — اکانت ۱
**چه شد:** آخرین approve route که خارج از transaction بود رفع شد: `app/api/payroll/runs/[id]/approve/route.ts`. SELECT FOR UPDATE داخل db.transaction + WHERE guard با `status='calculated'` روی UPDATE. P&L drilldown کد-بازی شد — کامل و صحیح، آماده تست مرورگر. Migration روی production اجرا شده تأیید شد (عکس‌های DBeaver).
**فایل‌ها:** `app/api/payroll/runs/[id]/approve/route.ts`
**Build:** tsc ✅ ۰ خطا · build ✅
**ناتمام:** —
**برای جلسه‌ی بعد:** تست P&L drilldown در مرورگر (کلیک روی ردیف‌های سود/زیان در صفحه گزارش). دسته‌های راه‌اندازی در Settings.

## 📓 2026-07-14 — تأیید نهایی فاز ۱ + رفع ۲ باگ اضافه + تست‌های رگرسیون (v0.24.0) — اکانت ۱
**چه شد:** بررسی عمیق و تأیید ۶ فیکس فاز ۱ (v0.23.0). دو مشکل اضافه کشف و رفع شد:
1. **Race condition در approve برگه انبار** (`app/api/inventory/vouchers/[id]/approve/route.ts`): همان باگ تراکنش — SELECT و status check خارج از `db.transaction()` بود، هیچ FOR UPDATE روی ردیف برگه وجود نداشت. رفع: قفل برگه با SELECT FOR UPDATE داخل transaction + WHERE guard روی UPDATE.
2. **WHERE guard تأیید تراکنش** (`app/api/transactions/[id]/approve/route.ts`): UPDATE فاقد `WHERE status='pending'` بود. رفع: `.where(and(..., or(status='pending', status='proforma')))`.
- **Migration**: `project-docs/migrations/001-unique-parent-voucher-id.sql` ساخته شد — UNIQUE INDEX CONCURRENTLY روی `inv_vouchers.parent_voucher_id WHERE NOT NULL`. اجرا روی production انجام شد (تأییدشده).
- **تست‌های رگرسیون**: `tests/unit/security-guards.test.ts` — 27 تست (WAC، approve guard، voucher guard، گزارش جلالی، maker-checker، unique reversal). همه سبز ✅.
**فایل‌ها:** `app/api/inventory/vouchers/[id]/approve/route.ts`، `app/api/transactions/[id]/approve/route.ts`، `project-docs/migrations/001-unique-parent-voucher-id.sql`، `tests/unit/security-guards.test.ts`
**Build:** tsc ✅ ۰ خطا · build ✅ · vitest 27/27 ✅
**ناتمام:** —
**برای جلسه‌ی بعد:** ۱) تست P&L drilldown در مرورگر. ۲) دسته‌های راه‌اندازی در UI.

