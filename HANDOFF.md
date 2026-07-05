# HANDOFF.md — دفتر وضعیت زنده‌ی پروژه «با شرف»

> این فایل **دفتر رله‌ی بین دو اکانت Claude Code** است که نوبتی روی همین پوشه کار می‌کنند.
> قانون طلایی: **هر جلسه اول بخش ۰ را بخوان؛ آخر جلسه بخش ۰ + ژورنال را به‌روز کن و commit/push کن.**
> جزئیات تاریخی قدیمی‌تر: `project-docs/handoff-archive.md` (اگر نبود، اولین جلسه بسازد).

---

## ⚡ بخش ۰ — وضعیت لحظه‌ای (اول این را بخوان)

| | |
|---|---|
| **نسخه** | `0.9.61-ui-features` |
| **آخرین به‌روزرسانی** | 2026-07-05 — اکانت: ۱ |
| **Build/tsc** | tsc سبز ✅ (۰ خطا) · unit tests ✅ 32/32 · build ✅ |
| **دیپلوی** | ✅ **GitHub Actions فعال** — workflow اکنون ۴ job جداگانه دارد: typecheck / unit-test / e2e / deploy. 🟡 **e2e job** نیاز به secret `STAGING_URL` در GitHub دارد (باید manually اضافه شود). ✅ **۴ migration اجرا شدند** (2026-07-04). |
| **کار نیمه‌تمام (in-progress)** | — |
| **کار بعدی پیشنهادی** | موارد 🟠 از بررسی جامع: ۱. rate limit قوی‌تر برای OTP send (sliding window). ۲. رفع parseFloat روی مقادیر مالی انبار (`lib/db/inventoryHelpers.ts:23`، `approve/route.ts`، `reversal/route.ts`). ۳. UI دکمه force-reset حقوق (SuperAdmin). |
| **بلاک‌شده/منتظر کاربر** | — |

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

## 📓 2026-07-05 — UI: هشدار انقضا + پیش‌بینی تقاضا + Prime Cost % — اکانت ۱
**چه شد:**
(۱) **هشدار انقضای موجودی** (`app/(app)/inventory/page.tsx`): کارت «هشدار انقضا» به hub انبار اضافه شد. فقط وقتی اقلام نزدیک یا گذشته از تاریخ انقضا وجود دارد نمایش می‌دهد (اگر همه سالم → کارت پنهان). برای هر قلم: نام، تاریخ انقضا، badge وضعیت (منقضی/امروز/فردا/N روز).
(۲) **پیش‌بینی تقاضا** (`app/(app)/inventory/kitchen/page.tsx`): جدول «پیش‌بینی مصرف فردا» در hub آشپزخانه اضافه شد. داده از `POST /api/inventory/forecast`. نمایش rawCoverage: قلم | مصرف روزانه | موجودی فعلی | کمبود احتمالی. ردیف‌های کمبود قرمز. واحدها تبدیل‌شده (qtyBase ÷ basePerUnit + unit).
(۳) **Prime Cost %** (`app/(app)/reports/page.tsx`): ردیف جدید بعد از «حقوق پرسنل» در P&L. Prime Cost = COGS + حقوق. درصد رنگ‌بندی: سبز ≤۶۰٪، کهربایی ۶۰–۶۵٪، قرمز >۶۵٪. آیکون Info با tooltip فارسی. `PLRow` با `marginColor` و `tooltip` prop گسترش یافت.
**فایل‌ها:** `app/(app)/inventory/page.tsx`, `app/(app)/inventory/kitchen/page.tsx`, `app/(app)/reports/page.tsx`
**Build:** tsc ✅ ۰ خطا · unit tests ✅ 32/32 — ۳ commit جدا
**ناتمام:** —
**برای جلسه‌ی بعد:** موارد 🟠: rate limit OTP send، parseFloat مالی انبار، UI force-reset حقوق.

## 📓 2026-07-04 — audit log برای ۶ عملیات مالی — اکانت ۱
**چه شد:**
۶ عملیات مالی که قبلاً هیچ ردپایی نمی‌گذاشتند حالا در `audit_log` ثبت می‌شوند:
- `transaction.created` — هر تراکنش جدید (id, type, amount, status, branchId)
- `transaction.rejected` — رد تراکنش (title, amount, reason, branchId)
- `transaction.imported` — import انبوه اکسل (count, branchIds)
- `payroll.posted` — post حقوق به حسابداری (runId, accountId, date؛ فقط اولین بار، نه idempotent replay)
- `payroll.reversed` — معکوس حقوق (هر دو route: DELETE روی `/post` و POST روی `/reverse`)
- `account.recalculated` — بازمحاسبه موجودی (count + old/new balance هر حساب)
`AuditAction` union در `lib/auth/audit.ts` با ۵ نوع جدید گسترش یافت (`transaction.rejected` از قبل بود).
**فایل‌ها:** `lib/auth/audit.ts`, `app/api/transactions/route.ts`, `app/api/transactions/[id]/reject/route.ts`, `app/api/transactions/import/route.ts`, `app/api/payroll/runs/[id]/post/route.ts`, `app/api/payroll/runs/[id]/reverse/route.ts`, `app/api/accounts/recalculate/route.ts`
**Build:** tsc ✅ ۰ خطا (بعد از هر commit جداگانه تأیید شد) — ۶ commit جدا
**ناتمام:** —
**برای جلسه‌ی بعد:** موارد 🟠 باقی‌مانده: rate limit OTP send، parseFloat مالی انبار، UI force-reset حقوق.

## 📓 2026-07-04 — امنیت: rate limit OTP + حذف console.log — اکانت ۱
**چه شد:**
(۱) **OTP verify rate limit**: `lib/auth/rateLimit.ts` با توابع phone-keyed rate limiting برای OTP گسترش یافت (`checkOtpRateLimit`, `recordOtpFailedAttempt`, `clearOtpAttempts`, `OTP_MAX_ATTEMPTS=5`). `verifyWebOtp` در `lib/ordering/webCustomer.ts` حالا: (الف) قبل از هر query rate limit را بررسی می‌کند (ب) بعد از ۵ شکست، OTP فعال را invalidate می‌کند (used=true) و 429 می‌دهد (ج) بعد از موفقیت counter را پاک می‌کند.
(۲) **OTP console.log**: خط `console.log([OTP MOCK]...)` در `createWebOtp` با `NODE_ENV !== 'production'` guard محافظت شد — در production لاگ نمی‌شود.
(۳) **Migration verify**: همه ۴ migration (proforma، is_active، warning/critical، financial_periods) در schema.ts تأیید شدند. ۲ فایل migration که agent بررسی جامع خالی کرده بود بازگردانی شدند.
**فایل‌ها:** `lib/auth/rateLimit.ts`, `lib/ordering/webCustomer.ts`, `HANDOFF.md`, `project-docs/INVESTIGATION-full-project-review.md`
**Build:** tsc ✅ ۰ خطا · unit tests ✅ 32/32
**ناتمام:** —
**برای جلسه‌ی بعد:** موارد 🟠 بعدی از بررسی جامع: audit log‌های ۶‌گانه (transaction create/reject/import، payroll post/reverse، account recalculate).

## 📓 2026-07-03 — P&L: صورت سود و زیان در گزارش مالی — اکانت ۱
**چه شد:** بخش «صورت سود و زیان» به صفحه‌ی `/reports` اضافه شد:
- **API** (`app/api/reports/route.ts`): یک query جدید که COGS (`'بهای تمام‌شده (COGS)'`) و حقوق پرسنل (`'حقوق پرسنل'`) را از جمع هزینه‌ها تفکیک می‌کند. response حاوی `pl: { revenue, cogs, grossProfit, payroll, otherExpense, netProfit }` شد.
- **UI** (`app/(app)/reports/page.tsx`): کارت P&L با ردیف‌های درآمد → COGS (منفی) → سود ناخالص (+ حاشیه%) → حقوق (منفی) → سایر هزینه‌ها (منفی) → سود خالص (+ حاشیه%). اعداد منفی با فرمت حسابداری `(عدد)` نمایش داده می‌شوند.
- TypeScript تمام: `pl` به interface `ReportData` اضافه شد.
**فایل‌ها:** `app/api/reports/route.ts`, `app/(app)/reports/page.tsx`
**Build:** tsc ✅ ۰ خطا · build ✅
**ناتمام:** —
**برای جلسه‌ی بعد:** تست در production — اگر COGS یا حقوق هنوز ثبت نشده باشند، همه صفر نشان می‌دهد (نرمال است). می‌توان ماه جاری را فیلتر کرد تا P&L دقیق‌تر باشد.

## 📓 2026-07-01 — Playwright E2E برای ۵ مسیر بحرانی — اکانت ۱
**چه شد:** زیرساخت کامل Playwright E2E اضافه شد:
- `playwright.config.ts`: chromium headless، timeout 30s، storageState، globalSetup/Teardown
- `tests/e2e/fixtures/seed.ts`: ساخت test user SuperAdmin (idempotent)
- `tests/e2e/global-setup.ts`: seed + browser login + ذخیره session
- `tests/e2e/global-teardown.ts`: DELETE کردن رکوردهای `[TEST]` از DB بعد از همه تست‌ها
- ۵ spec file: auth (3 تست) · transactions (3 تست + B1 regression) · contacts (3 تست) · payroll (3 تست) · inventory (3 تست)
- workflow restructure: ۴ job جداگانه — typecheck → unit-test → e2e (نیاز به secret `STAGING_URL`) → deploy
- `tsconfig.json`: `tests/e2e` از main type-check خارج شد
**فایل‌ها:** `playwright.config.ts`, `tests/e2e/**`, `tsconfig.json`, `package.json`, `.github/workflows/liara.yml`
**Build:** tsc ✅ ۰ خطا · unit tests ✅ 32/32. Commit: a369b57
**ناتمام:** —
**برای جلسه‌ی بعد:** کاربر باید secret `STAGING_URL` = آدرس لیارا را در GitHub → Settings → Secrets اضافه کند تا e2e job در CI کار کند. اجرای محلی: `npm run test:e2e` (نیاز به `.env.local` با DATABASE_URL).

## 📓 2026-07-01 — C7: فرم کارمند — ۱۳ فیلد تکمیلی با آکاردئون — اکانت ۱
**چه شد:** فیلدهایی که در API وجود داشتند ولی در UI نبودند به فرم افزودن/ویرایش کارمند اضافه شدند. بخش «اطلاعات تکمیلی» به‌صورت آکاردئون طراحی شد. فیلدها:
- **شناسه‌ها:** nationalId (validate 10 رقم + normalizeDigits)، insuranceNumber
- **مشخصات فردی:** fatherName، gender (select)، maritalStatus (select)
- **بانکی:** iban (validate IR+24 رقم، auto-uppercase)، bankAccount
- **مخاطب اضطراری:** emergencyContactName، emergencyContactPhone
- **بهداشت:** healthCardNumber، healthCardExpiryDate (ISO text input)
- **آدرس** (textarea)، **یادداشت** (textarea)
- آکاردئون هنگام ویرایش کارمندی که داده تکمیلی دارد خودکار باز می‌شود.
**فایل‌ها:** `app/(app)/employees/page.tsx`
**Build:** tsc ✅ ۰ خطا · build ✅. Commit: d186040
**ناتمام:** —
**برای جلسه‌ی بعد:** تست در production: ویرایش کارمند → باز کردن آکاردئون → ذخیره شماره ملی/شبا.

## 📓 2026-07-01 — فیکس مانده طرف‌حساب (بار دوم): تفکیک نقدی/نسیه — اکانت ۱
**چه شد:** فیکس قبلی (حذف isCredit=true) باعث شد پرداخت‌های نقدی به تأمین‌کننده مانده منفی (= «طلبکار از ما») بسازند که غلط بود. منطق صحیح پیاده شد:
- **مانده** فقط از `isCredit=true AND approved` — پرداخت نقدی مانده نمی‌سازد.
- `contactLedger.ts`: هر دو تابع فیلتر `isCredit=true` گرفتند؛ `isCredit: boolean` به `ContactLedgerEntry` اضافه شد.
- `contacts/route.ts`: کوئری bulk balance نیز `and(status=approved, isCredit=true)` فیلتر گرفت.
- `ContactLedgerDrawer`: دو بخش جداگانه — «مبادلات نقدی» (جریان تاریخی + جمع) و «حساب‌های نسیه» (مانده). کارت بالا فقط مانده نسیه نشان می‌دهد.
**فایل‌ها:** `lib/db/contactLedger.ts`, `app/api/contacts/route.ts`, `components/contacts/ContactLedgerDrawer.tsx`
**Build:** tsc ✅ ۰ خطا · build ✅. Commit: 1913ff5
**ناتمام:** —
**برای جلسه‌ی بعد:** تست در production: (الف) مانده طرف‌حساب‌ها باید ۰ باشد (هنوز نسیه‌ای نداریم) (ب) در drawer بخش «مبادلات نقدی» همه تراکنش‌های نقدی را نشان دهد (ج) dialog بازنشانی اجباری حقوق اردیبهشت (د) variance فروش واقعی.

