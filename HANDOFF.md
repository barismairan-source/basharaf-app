# HANDOFF.md — دفتر وضعیت زنده‌ی پروژه «با شرف»

> این فایل **دفتر رله‌ی بین دو اکانت Claude Code** است که نوبتی روی همین پوشه کار می‌کنند.
> قانون طلایی: **هر جلسه اول بخش ۰ را بخوان؛ آخر جلسه بخش ۰ + ژورنال را به‌روز کن و commit/push کن.**
> جزئیات تاریخی قدیمی‌تر: `project-docs/handoff-archive.md` (اگر نبود، اولین جلسه بسازد).

---

## ⚡ بخش ۰ — وضعیت لحظه‌ای (اول این را بخوان)

| | |
|---|---|
| **نسخه** | `0.9.57-playwright-e2e` |
| **آخرین به‌روزرسانی** | 2026-07-01 — اکانت: ۱ |
| **Build/tsc** | tsc سبز ✅ (۰ خطا) · unit tests ✅ 32/32 |
| **دیپلوی** | ✅ **GitHub Actions فعال** — workflow اکنون ۴ job جداگانه دارد: typecheck / unit-test / e2e / deploy. 🟡 **e2e job** نیاز به secret `STAGING_URL` در GitHub دارد (باید manually اضافه شود). 🟡 **۴ migration** در انتظار اجرای دستی در pgAdmin: `db-accounting-v1-migration.sql`، `db-admin-migration.sql`، `db-notifications-v2-migration.sql`، `db-financial-periods-migration.sql`. (اجراشده ✅: فاز۱ آشپزخانه + `db-user-roles-migration.sql`) |
| **کار نیمه‌تمام (in-progress)** | — |
| **کار بعدی پیشنهادی** | ۱. اضافه‌کردن secret `STAGING_URL` در GitHub → Settings → Secrets. ۲. اجرای محلی `npm run test:e2e` برای تأیید عملکرد. ۳. تست فرم کارمند + مانده طرف‌حساب در production. |
| **بلاک‌شده/منتظر کاربر** | secret `STAGING_URL` برای e2e job در CI. |

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

## 📓 2026-06-30 — شکاف ۳: variance نمای فروش واقعی — اکانت ۱
**چه شد:** پارامتر `?source=daily` به endpoint `GET /api/inventory/reports/variance` اضافه شد. نمای daily:
- **تئوریک:** از `inv_daily_sales` در بازه jalaliDate → parse JSONB lines (دو فرمت qty/count هر دو handle شدند) → join به `inv_recipes` + `inv_recipe_lines` + `inv_items` → محاسبه `(saleQty / portions) × qtyBase × (100 / effectivePct)` در TypeScript.
- **واقعی:** از `inv_stock_tx` kind∈(out,waste,sale) با فیلتر jalaliDate + فیلتر شعبه via `inv_items.branchId` (چون inv_stock_tx ستون branchId ندارد).
- نمای voucher (قدیمی) کاملاً دست‌نخورده ماند.
- UI: toggle «نمای حواله / نمای فروش واقعی» + یادداشت که رسپی فعلی مبنای محاسبه است.
- فایل migration اختیاری ساخته شد: `project-docs/migrations/db-variance-daily-perf-index.sql` (index روی item_id,jalali_date برای بازه‌های بزرگ).
**فایل‌ها:** `app/api/inventory/reports/variance/route.ts`, `app/(app)/inventory/variance/page.tsx`, `project-docs/migrations/db-variance-daily-perf-index.sql` (جدید)
**Build:** tsc ✅ ۰ خطا. Commit: f8feb71
**ناتمام:** —
**برای جلسه‌ی بعد:** تست با بازه واقعی فروش: نمای daily باید ردیف بیشتری از نمای voucher نشان دهد (فروش‌های مسیر ۲ و ۳). migration اختیاری تنها اگر گزارش کند بود اجرا شود.

## 📓 2026-06-30 — موج ۳ فیکس‌های UX (۱۹ مورد 🟡/🔵) — اکانت ۱
**چه شد:** همه‌ی ۱۹ آیتم موج ۳ پیاده و جداگانه commit شدند:
- **A6–A11**: overflow-x-auto برای جدول‌های موبایل (stocktake, cartable, sales, purchase-orders, DataList)
- **B3**: confirm dialog قبل از غیرفعال‌کردن حساب
- **B7**: KPICard از formatMoneyShort استفاده می‌کند
- **B8**: ردیف‌های دفتر کل به /transactions لینک می‌شوند
- **C4–C6**: حقوق — flex-wrap روی ردیف دکمه‌ها، whitespace-nowrap روی مبالغ فیش، flex-shrink-0 روی مبلغ رویداد
- **D3**: confirm قبل از حذف رزرو
- **D4**: confirm + راهنمای غیرفعال‌کردن قبل از حذف آیتم منو
- **D5**: هشدار پیشگیرانه اگر دسته آیتم داشته باشد (قبل از call به API)
- **D6**: آیکون Trash2 کوپن → EyeOff (رنگ amber) چون soft-deactivate است نه حذف
- **D7/D8**: truncate روی نام آیتم و دسته در جدول منو
- **D9**: truncate روی نام مشتری
- **D10**: truncate روی branchName در کارت سفارش
- **D11**: flex-shrink-0 روی قیمت آیتم در منوی عمومی
**فایل‌ها:** `app/(app)/inventory/stocktake/page.tsx`, `app/(app)/inventory/cartable/page.tsx`, `app/(app)/inventory/sales/page.tsx`, `app/(app)/purchase-orders/page.tsx`, `components/ui/DataList.tsx`, `app/(app)/reports/page.tsx`, `app/(app)/accounts/[id]/page.tsx`, `app/(app)/accounts/page.tsx`, `app/(app)/reservations/page.tsx`, `app/(app)/menu/page.tsx`, `app/(app)/coupons/page.tsx`, `app/(app)/customers/page.tsx`, `app/(app)/orders/page.tsx`, `components/menu/MenuItem.tsx`, `app/(app)/payroll/page.tsx`
**Build:** tsc ✅ ۰ خطا. Commits: c13666e, d4c9acf, 2165700, 555be48, 16c1f89, a73ad25
**ناتمام:** —
**برای جلسه‌ی بعد:** تست کاربر: (الف) مانده طرف‌حساب‌ها در production. (ب) dialog بازنشانی اجباری حقوق اردیبهشت. (ج) رفتار موج ۳ روی موبایل (truncate، overflow، flex-wrap).

## 📓 2026-06-30 — فیکس‌های داده: مانده طرف‌حساب + reverse حقوق بدون سند — اکانت ۱
**چه شد:**
(مشکل ۳) حذف فیلتر `isCredit=true` از محاسبه‌ی مانده طرف‌حساب: `contacts/route.ts` + `contactLedger.ts` + `calculateContactBalance` همه اصلاح شدند. از این پس همه تراکنش‌های approved (نقدی + نسیه) در مانده لحاظ می‌شوند. drawer هم به‌طور خودکار بهتر می‌شود چون از همان API می‌خواند. داده قبلی: ۵۰ از ۵۰ تراکنش طرف‌حساب isCredit=false بودند → مانده همیشه صفر.
(مشکل ۲) سه لایه اضافه شد: (الف) postToBasharaf خطای tagged با code=NO_JOURNAL_VOUCHER پرتاب می‌کند. (ب) reverse API این code را به client برمی‌گرداند (409). (ج) یک endpoint جدید `POST /api/payroll/runs/[id]/force-reset` فقط برای SuperAdmin ساخته شد که بدون اثر مالی status → approved می‌کند + audit می‌نویسد. اگر posted journal_voucher واقعی وجود داشته باشد → خطا (از reverse عادی استفاده کن). UI هم dialog هشدار نشان می‌دهد.
endpoint تشخیصی موقت `/api/admin/diag` حذف شد.
**فایل‌ها:** `app/api/contacts/route.ts`, `lib/db/contactLedger.ts`, `components/contacts/ContactLedgerDrawer.tsx`, `lib/payroll/postToBasharaf.ts`, `app/api/payroll/runs/[id]/reverse/route.ts`, `app/api/payroll/runs/[id]/force-reset/route.ts` (جدید), `lib/auth/audit.ts`, `store/slices/payrollSlice.ts`, `app/(app)/payroll/page.tsx`
**Build:** tsc ✅ ۰ خطا. Commits: c2cf436, 419e4df, 2541657
**ناتمام:** —
**برای جلسه‌ی بعد:** تست کاربر: (الف) صفحه طرف‌حساب مانده نشان دهد؟ (ب) دکمه‌ی «برگشت ثبت» اردیبهشت ۱۴۰۵ → dialog بازنشانی اجباری نشان دهد؟

## 📓 2026-06-29 — فیکس ۱ + تفکیک drawer + endpoint تشخیصی — اکانت ۱
**چه شد:**
(فیکس ۱) route محاسبه مجدد حقوق: اگر دوره قبلاً payslips داشته باشد، از همان employee IDs (نه re-query کارمندان فعال) محاسبه می‌کند → soft-delete بعدی دیگر NO_EMPLOYEES نمی‌دهد.
(نیاز جدید) `ContactLedgerDrawer`: دو ردیف «جمع دریافتی» و «جمع پرداختی» (approved) در بالای drawer اضافه شد — کاملاً client-side از entries موجود.
(تشخیص) `GET /api/admin/diag` (موقت، SuperAdmin) ساخته شد: isCredit distribution روی تراکنش‌های با contactId + audit دوره‌های posted بدون journal_voucher. **بعد از دریافت نتیجه از کاربر → فایل حذف شود.**
**فایل‌ها:** `app/api/payroll/runs/[id]/calculate/route.ts`, `components/contacts/ContactLedgerDrawer.tsx`, `app/api/admin/diag/route.ts` (موقت)
**Build:** tsc ✅ ۰ خطا · tests ✅ 32/32. Commits: 97ffe5f, 7aa00d6, bf0721a
**ناتمام:** منتظر نتیجه‌ی `/api/admin/diag` برای تشخیص مشکل ۲ (reverse posted) و مشکل ۳ (contact balance).
**برای جلسه‌ی بعد:** کاربر `/api/admin/diag` را باز می‌کند → نتیجه → فیکس ۲ و ۳ طراحی می‌شوند.


